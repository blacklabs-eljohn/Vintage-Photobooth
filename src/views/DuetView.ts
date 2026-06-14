import type { AppView, AppState } from '../types';
import { AudioManager } from '../components/AudioManager';
import { CameraManager } from '../components/CameraManager';
import { 
  uploadDuetFrame, 
  fetchDuetFrames, 
  subscribeToDuetRoom 
} from '../components/SupabaseClient';

type DuetState = 'lobby' | 'setup' | 'capturing' | 'stitching';

export class DuetView implements AppView {
  private state: AppState;
  private audio: AudioManager;
  private camera: CameraManager;
  private onViewChange: (view: 'landing' | 'customize') => void;

  private roomId: string;
  private role: 'host' | 'partner';
  
  private viewState: DuetState = 'lobby';
  private subscription: any = null;
  private presenceChannel: any = null;
  
  // View rendering DOM hooks
  private container: HTMLElement | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private timeoutId: any = null;
  private countdownInterval: any = null;

  // Realtime Sync status
  private partnerOnline: boolean = false;
  private hostOnline: boolean = false;
  private localCameraReady: boolean = false;
  private partnerCameraReady: boolean = false;
  
  // Shot states
  private currentFrameIndex: number = 0;
  private hasSnappedLocal: boolean[] = [false, false, false];
  private remoteFrames: { [index: number]: string } = {};
  private localFrames: { [index: number]: string } = {};

  constructor(
    state: AppState,
    audio: AudioManager,
    camera: CameraManager,
    onViewChange: (view: 'landing' | 'customize') => void
  ) {
    this.state = state;
    this.audio = audio;
    this.camera = camera;
    this.onViewChange = onViewChange;
    
    this.roomId = this.state.duetRoomId || '';
    this.role = this.state.duetRole || 'host';
  }

  public render(container: HTMLElement) {
    this.container = container;
    this.initializeRoom();
    this.renderState();
  }

  private initializeRoom() {
    if (this.subscription) return; // Already initialized

    const roomSub = subscribeToDuetRoom(
      this.roomId,
      this.role,
      (newFrame) => this.handleNewDbFrame(newFrame),
      (presenceState) => this.handlePresenceSync(presenceState),
      {
        start_setup: () => {
          this.transitionToState('setup');
        },
        camera_ready: (payload: any) => {
          if (payload.payload && payload.payload.role !== this.role) {
            this.partnerCameraReady = true;
            this.renderState();
          }
        },
        start_capturing: () => {
          this.transitionToState('capturing');
        },
        trigger_countdown: (payload: any) => {
          if (payload.payload) {
            this.triggerLocalCountdown(payload.payload.frameIndex);
          }
        },
        send_reaction: (payload: any) => {
          if (payload.payload && payload.payload.type) {
            this.triggerReaction(payload.payload.type);
          }
        }
      }
    );

    this.subscription = roomSub;
    this.presenceChannel = roomSub.presenceChannel;
  }

  private broadcast(event: string, payload: any = {}) {
    if (this.presenceChannel) {
      this.presenceChannel.send({
        type: 'broadcast',
        event,
        payload,
      });
    }
  }

  private handlePresenceSync(presenceState: any) {
    const presences = Object.values(presenceState).flat() as any[];
    this.hostOnline = presences.some((p) => p.role === 'host');
    this.partnerOnline = presences.some((p) => p.role === 'partner');
    
    this.renderState();
  }

  private handleNewDbFrame(newFrame: any) {
    // Only pay attention to frames uploaded by the other role
    if (newFrame.user_id !== this.role) {
      const idx = newFrame.frame_index;
      this.remoteFrames[idx] = newFrame.image_data;
      
      this.audio.playTick(); // Tick sound to notify photo received
      
      // Update remote viewfinder placeholder if in capture view
      if (this.viewState === 'capturing') {
        const placeholder = this.container?.querySelector('#remotePlaceholder') as HTMLElement;
        const remoteImg = this.container?.querySelector('#remoteSnapshotImg') as HTMLImageElement;
        
        if (placeholder && remoteImg) {
          placeholder.style.display = 'none';
          remoteImg.src = newFrame.image_data;
          remoteImg.style.display = 'block';
        }
      }

      this.checkSequenceProgress();
    }
  }

  private transitionToState(nextState: DuetState) {
    this.viewState = nextState;
    this.renderState();
  }

  private async renderState() {
    if (!this.container) return;

    if (this.viewState === 'lobby') {
      this.renderLobby();
    } else if (this.viewState === 'setup') {
      this.renderSetup();
    } else if (this.viewState === 'capturing') {
      await this.renderCapturing();
    } else if (this.viewState === 'stitching') {
      this.renderStitching();
    }
  }

  private renderLobby() {
    const shareLink = `${window.location.origin}/?room=${this.roomId}`;
    
    this.container!.innerHTML = `
      <div class="view-panel">
        <div class="reaction-overlay-container" id="reactionOverlayContainer"></div>
        <div class="booth-inner-console lobby-panel">
          <h2 class="setup-title">LDR Duet Lobby</h2>
          <p class="console-help-text">Invite your partner to step inside the photobooth cabinet with you.</p>
          
          <div class="lobby-share-box">
            <span class="lobby-link-label">SHARE LINK WITH PARTNER</span>
            <div class="lobby-link-input-row">
              <input type="text" id="shareLinkInput" class="lobby-link-input" readonly value="${shareLink}" />
              <button id="copyLinkBtn" class="btn-primary console-btn-primary" style="margin: 0; padding: 10px 14px; min-width: auto; max-width: auto; width: auto;">Copy</button>
            </div>
          </div>

          <div class="lobby-status-box">
            <div class="presence-indicator">
              <span class="status-dot ${this.hostOnline ? 'active' : ''}"></span>
              <span class="presence-label">Host: ${this.hostOnline ? '🟢 Connected' : '🔴 Offline'}</span>
            </div>
            <div class="presence-indicator" style="margin-top: 8px;">
              <span class="status-dot ${this.partnerOnline ? 'active' : ''}"></span>
              <span class="presence-label">Partner: ${this.partnerOnline ? '🟢 Connected' : '🔴 Offline'}</span>
            </div>
          </div>

          <div class="console-actions">
            ${this.role === 'host'
              ? `<button id="enterCabinetBtn" class="btn-primary console-btn-primary" ${this.partnerOnline ? '' : 'disabled'}>STEP INSIDE CABINET</button>`
              : `<p class="console-help-text" style="color: #eab308; font-weight: bold; animation: led-blink 1s infinite alternate;">Waiting for host to start setup...</p>`
            }
            <button id="abortDuetBtn" class="btn-secondary console-btn-secondary" style="margin-top: 8px;">ABORT SESSION</button>
          </div>

          <div class="duet-react-panel" style="margin-top: 16px;">
            <span class="react-label">Send Reaction:</span>
            <div class="react-buttons">
              <button class="react-btn" data-react="ping">🔔 Ping</button>
              <button class="react-btn" data-react="cheese">🧀 Smile</button>
              <button class="react-btn" data-react="wink">😉 Wink</button>
              <button class="react-btn" data-react="love">❤️ Love</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook copy button
    const copyBtn = this.container!.querySelector('#copyLinkBtn');
    const shareInput = this.container!.querySelector('#shareLinkInput') as HTMLInputElement;
    copyBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      shareInput.select();
      navigator.clipboard.writeText(shareInput.value);
      alert('Invite link copied to clipboard!');
    });

    const enterCabinetBtn = this.container!.querySelector('#enterCabinetBtn');
    enterCabinetBtn?.addEventListener('click', () => {
      this.audio.playCoinDrop();
      this.broadcast('start_setup');
      this.transitionToState('setup');
    });

    const abortDuetBtn = this.container!.querySelector('#abortDuetBtn');
    abortDuetBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      this.destroy();
      this.onViewChange('landing');
    });

    this.hookReactButtons(this.container!);
  }

  private renderSetup() {
    this.container!.innerHTML = `
      <div class="view-panel">
        <div class="booth-inner-console">
          <!-- CRT Lens Viewfinder Window -->
          <div class="console-viewfinder">
            <!-- Blinking LED indicator status -->
            <div class="viewfinder-status">
              <span class="status-led status-yellow" id="statusLed"></span>
              <span class="status-label" id="statusLabel">LENS STANDBY</span>
            </div>
            
            <!-- Lens Glass Bezel & Aperture -->
            <div class="lens-glass-bezel">
              <div class="lens-crosshairs"></div>
              <svg class="lens-aperture" id="lensAperture" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z" class="aperture-outline"/>
                <path d="M50 0 L50 50 M100 25 L50 50 M100 75 L50 50 M50 100 L50 50 M0 75 L50 50 M0 25 L50 50" class="aperture-blades"/>
              </svg>
            </div>
            
            <div class="lens-scanlines"></div>
          </div>
          
          <!-- LED Step/Instruction Display -->
          <div class="console-ticker">
            <span class="ticker-text" id="tickerText">INITIALIZING SHUTTER SYSTEM...</span>
          </div>
          
          <!-- Console Actions Box -->
          <div class="console-actions" style="display: flex; flex-direction: column; gap: 10px; align-items: center;">
            <div class="lobby-status-box">
              <div class="presence-indicator">
                <span class="status-dot ${this.localCameraReady ? 'active' : ''}"></span>
                <span class="presence-label">Your Camera: ${this.localCameraReady ? '🟢 Ready' : '🔴 Calibrating'}</span>
              </div>
              <div class="presence-indicator" style="margin-top: 6px;">
                <span class="status-dot ${this.partnerCameraReady ? 'active' : ''}"></span>
                <span class="presence-label">Partner's Camera: ${this.partnerCameraReady ? '🟢 Ready' : '🔴 Calibrating'}</span>
              </div>
            </div>

            <p class="console-help-text">Please authorize camera permissions. Once both lenses are active, the session can begin.</p>
            
            ${this.role === 'host'
              ? `<button id="startCapturingBtn" class="btn-primary console-btn-primary" ${this.localCameraReady && this.partnerCameraReady ? '' : 'disabled'}>START DUET SHOT</button>`
              : `<p class="console-help-text" style="color: #eab308; font-weight: bold; animation: led-blink 1s infinite alternate;">Waiting for host to start cameras...</p>`
            }
            <button id="backToHomeBtn" class="btn-secondary console-btn-secondary">ABORT</button>
          </div>
        </div>
      </div>
    `;

    const statusLed = this.container!.querySelector('#statusLed') as HTMLElement;
    const statusLabel = this.container!.querySelector('#statusLabel') as HTMLElement;
    const tickerText = this.container!.querySelector('#tickerText') as HTMLElement;
    const lensAperture = this.container!.querySelector('#lensAperture') as HTMLElement;
    const startCapturingBtn = this.container!.querySelector('#startCapturingBtn');
    const backToHomeBtn = this.container!.querySelector('#backToHomeBtn');

    const setStatus = (state: 'loading' | 'connecting' | 'online') => {
      if (!statusLed || !statusLabel || !tickerText) return;
      statusLed.className = 'status-led';
      if (state === 'loading') {
        statusLed.classList.add('status-yellow');
        statusLabel.textContent = 'LENS STANDBY';
        tickerText.textContent = 'CALIBRATING LENS MODULES...';
      } else if (state === 'connecting') {
        statusLed.classList.add('status-yellow');
        statusLabel.textContent = 'CONNECTING';
        tickerText.textContent = 'CONNECTING CAMERA DEVICE...';
      } else if (state === 'online') {
        statusLed.classList.add('status-green');
        statusLabel.textContent = 'LENS ONLINE';
        tickerText.textContent = 'LENS ACTIVE - WAITING FOR PARTNER';
        if (lensAperture) lensAperture.style.transform = 'rotate(90deg)';
      }
    };

    // Auto-trigger permissions on setup render
    const startLocalCamera = async () => {
      if (this.localCameraReady) return;
      setStatus('connecting');

      const tempVideo = document.createElement('video');
      tempVideo.style.display = 'none';
      document.body.appendChild(tempVideo);

      try {
        await this.camera.startCamera(tempVideo);
        this.camera.stopCamera();
        tempVideo.remove();

        this.localCameraReady = true;
        setStatus('online');
        this.audio.playBeep();
        
        // Broadcast camera ready signal
        this.broadcast('camera_ready', { role: this.role });
        this.renderState();
      } catch (err) {
        console.warn('Camera blocked in setup:', err);
        tempVideo.remove();
        alert('Could not access camera. Aborting duet session.');
        this.destroy();
        this.onViewChange('landing');
      }
    };

    backToHomeBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      this.destroy();
      this.onViewChange('landing');
    });

    startCapturingBtn?.addEventListener('click', () => {
      this.audio.playCoinDrop();
      this.broadcast('start_capturing');
      this.transitionToState('capturing');
    });

    // Run camera access
    setStatus('loading');
    this.timeoutId = setTimeout(() => {
      startLocalCamera();
    }, 600);
  }

  private async renderCapturing() {
    this.container!.innerHTML = `
      <div class="view-panel">
        <div class="reaction-overlay-container" id="reactionOverlayContainer"></div>
        <div class="booth-inner-console capture-panel">
          <!-- Viewfinders Row -->
          <div class="duet-viewfinders">
            <!-- Local Viewfinder -->
            <div class="duet-viewfinder-box">
              <div class="viewfinder-label">YOUR LENS</div>
              <div class="duet-video-container">
                <video id="boothVideo" class="camera-video" autoplay playsinline></video>
                <div class="lens-scanlines"></div>
              </div>
            </div>
            
            <!-- Remote Viewfinder -->
            <div class="duet-viewfinder-box">
              <div class="viewfinder-label">PARTNER'S LENS</div>
              <div class="duet-video-container" id="remoteViewfinder">
                <div class="remote-placeholder" id="remotePlaceholder">
                  <svg class="placeholder-icon animate-pulse" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                  <span class="placeholder-text" id="remotePlaceholderText">Waiting for photo...</span>
                </div>
                <img id="remoteSnapshotImg" class="remote-snapshot" style="display: none;" />
                <div class="lens-scanlines"></div>
              </div>
            </div>
          </div>

          <!-- Indicator bulbs row (3 bulbs) -->
          <div class="duet-indicators-row">
            <div class="indicator-bulb" id="bulb-0" title="Photo 1"></div>
            <div class="indicator-bulb" id="bulb-1" title="Photo 2"></div>
            <div class="indicator-bulb" id="bulb-2" title="Photo 3"></div>
          </div>

          <!-- Status LED banner -->
          <div class="console-ticker">
            <span class="ticker-text" id="tickerText">READY TO SHOOT</span>
          </div>

          <!-- Actions -->
          <div class="console-actions">
            ${this.role === 'host'
              ? `<button id="startShutterBtn" class="btn-primary console-btn-primary">START SHUTTER</button>`
              : `<p class="console-help-text" style="color: #eab308; text-align: center; font-weight: bold; animation: led-blink 1s infinite alternate;">Waiting for host to fire shutter...</p>`
            }
            <button id="abortSessionBtn" class="btn-secondary console-btn-secondary" style="margin-top: 8px;">ABORT</button>
          </div>

          <div class="duet-react-panel" style="margin-top: 10px;">
            <span class="react-label">Send Reaction:</span>
            <div class="react-buttons">
              <button class="react-btn" data-react="ping">🔔 Ping</button>
              <button class="react-btn" data-react="cheese">🧀 Smile</button>
              <button class="react-btn" data-react="wink">😉 Wink</button>
              <button class="react-btn" data-react="love">❤️ Love</button>
            </div>
          </div>

          <!-- Countdown Overlay inside screen -->
          <div class="countdown-overlay" id="countdownOverlay" style="display: none;">
            <div class="countdown-number" id="countdownNumber">3</div>
          </div>
        </div>
      </div>
    `;

    this.videoEl = this.container!.querySelector('#boothVideo') as HTMLVideoElement;
    const startShutterBtn = this.container!.querySelector('#startShutterBtn');
    const abortSessionBtn = this.container!.querySelector('#abortSessionBtn');

    // Start video stream
    try {
      if (this.videoEl) {
        await this.camera.startCamera(this.videoEl);
      }
    } catch (err) {
      console.error('Failed to bind video stream in duet capturing:', err);
      alert('Viewfinder stream failed. Aborting session.');
      this.destroy();
      this.onViewChange('landing');
      return;
    }

    startShutterBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      this.broadcast('trigger_countdown', { frameIndex: this.currentFrameIndex });
      this.triggerLocalCountdown(this.currentFrameIndex);
    });

    abortSessionBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      this.destroy();
      this.onViewChange('landing');
    });

    // Synchronize UI if some photos were already taken
    this.updateIndicators();
    this.hookReactButtons(this.container!);
  }

  private renderStitching() {
    this.container!.innerHTML = `
      <div class="view-panel">
        <div class="booth-inner-console">
          <div class="console-viewfinder">
            <!-- Spinner -->
            <div class="lens-glass-bezel">
              <div class="lens-crosshairs"></div>
              <svg class="lens-aperture" id="lensAperture" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.5" style="animation: spin 2s linear infinite;">
                <path d="M50 0 L100 25 L100 75 L50 100 L0 75 L0 25 Z" class="aperture-outline"/>
                <path d="M50 0 L50 50 M100 25 L50 50 M100 75 L50 50 M50 100 L50 50 M0 75 L50 50 M0 25 L50 50" class="aperture-blades"/>
              </svg>
            </div>
            <div class="lens-scanlines"></div>
          </div>
          
          <div class="console-ticker">
            <span class="ticker-text" style="animation: led-blink 0.5s infinite alternate;">DEVELOPING DUET STRIP...</span>
          </div>
          <p class="console-help-text">Stitching New York and London snaps together on canvas...</p>
        </div>
      </div>
    `;

    // Trigger canvas stitch
    this.executeStitching();
  }

  private updateIndicators() {
    for (let i = 0; i < 3; i++) {
      const bulb = this.container?.querySelector(`#bulb-${i}`) as HTMLElement;
      if (bulb) {
        if (this.currentFrameIndex === i) {
          bulb.className = 'indicator-bulb capturing';
        } else if (i < this.currentFrameIndex) {
          bulb.className = 'indicator-bulb active';
        } else {
          bulb.className = 'indicator-bulb';
        }
      }
    }
  }

  private async triggerLocalCountdown(frameIndex: number) {
    const countdownOverlay = this.container?.querySelector('#countdownOverlay') as HTMLElement;
    const countdownNumber = this.container?.querySelector('#countdownNumber') as HTMLElement;
    const tickerText = this.container?.querySelector('#tickerText') as HTMLElement;
    const startShutterBtn = this.container?.querySelector('#startShutterBtn') as HTMLButtonElement;

    if (startShutterBtn) startShutterBtn.disabled = true;
    if (countdownOverlay) countdownOverlay.style.display = 'flex';

    // Clear remote snapshot preview from the remote screen for the new shot
    const placeholder = this.container?.querySelector('#remotePlaceholder') as HTMLElement;
    const remoteImg = this.container?.querySelector('#remoteSnapshotImg') as HTMLImageElement;
    const placeholderText = this.container?.querySelector('#remotePlaceholderText') as HTMLElement;
    if (placeholder && remoteImg && placeholderText) {
      placeholder.style.display = 'flex';
      placeholderText.textContent = `Capturing Shot ${frameIndex + 1}...`;
      remoteImg.style.display = 'none';
      remoteImg.src = '';
    }

    for (let sec = 3; sec >= 1; sec--) {
      if (countdownNumber) countdownNumber.textContent = sec.toString();
      if (tickerText) tickerText.textContent = `📷 SHUTTER OPEN IN ${sec}...`;
      
      this.audio.playTick();
      await this.wait(1000);
    }

    // Capture Local Photo
    if (countdownOverlay) countdownOverlay.style.display = 'none';
    if (tickerText) tickerText.textContent = '📸 SHUTTER SNAP!';
    
    this.audio.playShutter();
    const flashOverlay = document.getElementById('shutterFlash') as HTMLElement;
    flashOverlay?.classList.add('active');

    setTimeout(() => {
      flashOverlay?.classList.remove('active');
    }, 150);

    try {
      const fullFrame = this.camera.captureFrame();
      // Compress frame to ~20KB for high performance postgres transfer
      const compressedFrame = await this.compressImageData(fullFrame, 400);
      
      this.localFrames[frameIndex] = compressedFrame;
      this.hasSnappedLocal[frameIndex] = true;

      // Upload frame to public DB table
      await uploadDuetFrame(this.roomId, this.role, frameIndex, compressedFrame);
    } catch (err) {
      console.error('Failed capturing local frame:', err);
    }

    this.checkSequenceProgress();
  }

  private checkSequenceProgress() {
    const currentIdx = this.currentFrameIndex;
    const localReady = this.hasSnappedLocal[currentIdx];
    const remoteReady = !!this.remoteFrames[currentIdx];

    const tickerText = this.container?.querySelector('#tickerText') as HTMLElement;

    if (localReady && remoteReady) {
      // Both snapped! Show a quick preview and increment shot index
      if (tickerText) tickerText.textContent = `✅ SHOT ${currentIdx + 1} CAPTURED!`;
      
      // Update UI preview for both local/remote snaps on this screen
      const remoteImg = this.container?.querySelector('#remoteSnapshotImg') as HTMLImageElement;
      if (remoteImg && this.remoteFrames[currentIdx]) {
        remoteImg.src = this.remoteFrames[currentIdx];
        remoteImg.style.display = 'block';
        const placeholder = this.container?.querySelector('#remotePlaceholder') as HTMLElement;
        if (placeholder) placeholder.style.display = 'none';
      }

      this.timeoutId = setTimeout(() => {
        if (this.currentFrameIndex < 2) {
          this.currentFrameIndex++;
          this.updateIndicators();
          
          if (tickerText) tickerText.textContent = 'READY TO SHOOT';
          
          const startShutterBtn = this.container?.querySelector('#startShutterBtn') as HTMLButtonElement;
          if (startShutterBtn) startShutterBtn.disabled = false;
          
          // Re-render instructions for partner
          const placeholderText = this.container?.querySelector('#remotePlaceholderText') as HTMLElement;
          if (placeholderText) placeholderText.textContent = 'Waiting for photo...';
        } else {
          // Finished all 3 shots. Proceed to developing
          this.transitionToState('stitching');
        }
      }, 2000);
    } else if (localReady && !remoteReady) {
      if (tickerText) tickerText.textContent = 'WAITING FOR PARTNER SHUTTER...';
    } else if (!localReady && remoteReady) {
      if (tickerText) tickerText.textContent = 'PARTNER SNAPPED! WAITING FOR YOU...';
    }
  }

  private async executeStitching() {
    try {
      const hostFrames: string[] = [];
      const partnerFrames: string[] = [];

      // Query database directly to secure all frames (in case realtime update had a lag)
      const allFrames = await fetchDuetFrames(this.roomId);

      for (let i = 0; i < 3; i++) {
        const hostFrame = allFrames.find((f) => f.user_id === 'host' && f.frame_index === i);
        const partnerFrame = allFrames.find((f) => f.user_id === 'partner' && f.frame_index === i);

        // Fallback to local caches if database read had delays
        const hostData = hostFrame ? hostFrame.image_data : (this.role === 'host' ? this.localFrames[i] : this.remoteFrames[i]);
        const partnerData = partnerFrame ? partnerFrame.image_data : (this.role === 'partner' ? this.localFrames[i] : this.remoteFrames[i]);

        if (!hostData || !partnerData) {
          throw new Error(`Missing frame pair for frame index ${i}`);
        }

        hostFrames.push(hostData);
        partnerFrames.push(partnerData);
      }

      // Merge each pair side-by-side using Canvas
      const mergedUrls: string[] = [];
      for (let i = 0; i < 3; i++) {
        const merged = await this.mergeFramesSideBySide(hostFrames[i], partnerFrames[i]);
        mergedUrls.push(merged);
      }

      // Store in App State
      this.state.capturedFrames = mergedUrls;
      
      this.audio.playBeep();
      this.destroy();
      this.onViewChange('customize');
    } catch (err) {
      console.error('Stitching duet frames failed:', err);
      alert('Developing photostrip failed due to a frame loading issue. Restarting.');
      this.destroy();
      this.onViewChange('landing');
    }
  }

  private mergeFramesSideBySide(hostBase64: string, partnerBase64: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      canvas.width = 700;
      canvas.height = 525; // 4:3 high-res frame ratio matching StripGenerator
      
      const ctx = canvas.getContext('2d')!;
      
      const imgHost = new Image();
      const imgPartner = new Image();
      
      let loaded = 0;
      const checkLoaded = () => {
        loaded++;
        if (loaded === 2) {
          // Draw left half: Host
          DuetView.drawImageAspectFill(ctx, imgHost, 0, 0, 350, 525);
          // Draw right half: Partner
          DuetView.drawImageAspectFill(ctx, imgPartner, 350, 0, 350, 525);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        }
      };
      
      imgHost.onload = checkLoaded;
      imgPartner.onload = checkLoaded;
      imgHost.onerror = () => reject('Failed to load host image');
      imgPartner.onerror = () => reject('Failed to load partner image');
      
      imgHost.src = hostBase64;
      imgPartner.src = partnerBase64;
    });
  }

  private static drawImageAspectFill(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) {
    const iw = img.width;
    const ih = img.height;
    
    const scale = Math.max(w / iw, h / ih);
    const nw = iw * scale;
    const nh = ih * scale;
    
    const sx = (nw - w) / 2 / scale;
    const sy = (nh - h) / 2 / scale;
    const sw = iw - (nw - w) / scale;
    const sh = ih - (nh - h) / scale;
    
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  }

  private compressImageData(dataUrl: string, maxDim: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8)); // 80% compression
      };
      img.src = dataUrl;
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.timeoutId = setTimeout(resolve, ms);
    });
  }

  private hookReactButtons(container: HTMLElement) {
    const buttons = container.querySelectorAll('.react-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const reactType = btn.getAttribute('data-react');
        if (reactType) {
          this.audio.playTypewriter();
          this.broadcast('send_reaction', { type: reactType });
          this.triggerReaction(reactType); // Show locally too!
        }
      });
    });
  }

  private triggerReaction(type: string) {
    const container = this.container?.querySelector('#reactionOverlayContainer') as HTMLElement;
    if (!container) return;

    const badge = document.createElement('div');
    badge.className = `reaction-badge badge-${type}`;
    
    let label = '';
    if (type === 'ping') {
      label = '🔔 PING!';
      this.audio.playBeep();
    } else if (type === 'cheese') {
      label = '🧀 SAY CHEESE!';
      this.audio.playShutter();
      // Flash local viewfinder briefly
      const flash = this.container?.querySelector('#boothVideo') as HTMLElement;
      if (flash) {
        flash.classList.add('flash-effect');
        setTimeout(() => flash.classList.remove('flash-effect'), 200);
      }
    } else if (type === 'wink') {
      label = '😉 WINK!';
      this.audio.playTypewriter();
    } else if (type === 'love') {
      label = '❤️ LOVE!';
      this.audio.playCoinDrop();
      
      // Heart particles shower cascade
      for (let i = 0; i < 8; i++) {
        const heart = document.createElement('div');
        heart.className = 'floating-heart';
        heart.textContent = '❤️';
        heart.style.left = `${20 + Math.random() * 60}%`;
        heart.style.animationDelay = `${i * 0.1}s`;
        container.appendChild(heart);
        setTimeout(() => heart.remove(), 1500);
      }
    }

    badge.textContent = label;
    container.appendChild(badge);

    setTimeout(() => {
      badge.remove();
    }, 2000);
  }

  public destroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    this.camera.stopCamera();

    // Clean channels
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = null;
      this.presenceChannel = null;
    }
  }
}
