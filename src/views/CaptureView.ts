import type { AppView, AppState } from '../types';
import { AudioManager } from '../components/AudioManager';
import { CameraManager } from '../components/CameraManager';

export class CaptureView implements AppView {
  private state: AppState;
  private audio: AudioManager;
  private camera: CameraManager;
  private onViewChange: (view: 'customize' | 'landing') => void;

  private videoEl: HTMLVideoElement | null = null;
  private captureActive: boolean = false;
  private countdownTimeout: any = null;
  private sessionTimeout: any = null;
  private timecodeInterval: any = null;

  constructor(
    state: AppState,
    audio: AudioManager,
    camera: CameraManager,
    onViewChange: (view: 'customize' | 'landing') => void
  ) {
    this.state = state;
    this.audio = audio;
    this.camera = camera;
    this.onViewChange = onViewChange;
  }

  public async render(container: HTMLElement) {
    // Clean old captures
    this.state.capturedFrames = [];

    container.innerHTML = `
      <div class="view-panel">
        <div class="booth-layout">
          <!-- Viewfinder Window mimicking old cathode screen/lens -->
          <div class="viewfinder-outer">
            <video id="boothVideo" class="camera-video" autoplay playsinline></video>
            
            <!-- Live light leak overlay -->
            <div class="viewfinder-light-leak" id="viewfinderLightLeak"></div>
            
            <!-- Grid Lines overlay -->
            <div class="overlay-grid"></div>

            <!-- Header UI over camera -->
            <div class="viewfinder-overlay">
              <div class="overlay-top">
                <div class="overlay-status">
                  <span class="status-dot" id="statusDot"></span>
                  <span id="statusLabel">Standby</span>
                </div>
                <div class="overlay-status" style="font-family: var(--font-led); color: #c5a880;">
                  🔋 88% [||| ]
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: flex-end; color: #fff; font-family: var(--font-led); font-size: 0.75rem; text-shadow: 0 1px 3px rgba(0,0,0,0.8); padding-bottom: 2px;">
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span class="status-dot recording" style="width: 8px; height: 8px; margin-right: 2px;"></span>
                  <span>REC 24fps</span>
                </div>
                <div id="camTimecode">TC 0:00:00:00</div>
              </div>
            </div>

            <!-- Countdown Overlay -->
            <div class="countdown-overlay" id="countdownOverlay">
              <div class="countdown-number" id="countdownNumber">3</div>
            </div>
          </div>

          <!-- Mechanical Control Board -->
          <div class="booth-controls">
            <!-- Left: 3 Bulb indicators for 3 shots -->
            <div class="booth-indicators">
              <div class="indicator-bulb" id="bulb-0" title="Photo 1"></div>
              <div class="indicator-bulb" id="bulb-1" title="Photo 2"></div>
              <div class="indicator-bulb" id="bulb-2" title="Photo 3"></div>
            </div>

            <!-- Center: Retro Instructions -->
            <div class="booth-instructions" id="boothInstructions">
              Ready to shoot
            </div>

            <!-- Right: Big red shutter trigger -->
            <button class="booth-shutter-trigger" id="shutterTriggerBtn" title="Start Capture"></button>
          </div>

          <!-- Bottom Actions -->
          <div style="margin-top: 24px; display: flex; gap: 12px; width: 100%; max-width: 320px;">
            <button id="cancelCaptureBtn" class="btn-secondary" style="flex: 1;">Cancel</button>
            <button id="switchCameraBtn" class="btn-secondary" style="flex: 1; display: none;">Flip Lens</button>
          </div>
        </div>
      </div>
    `;

    this.videoEl = container.querySelector('#boothVideo') as HTMLVideoElement;
    const shutterTriggerBtn = container.querySelector('#shutterTriggerBtn') as HTMLButtonElement;
    const cancelCaptureBtn = container.querySelector('#cancelCaptureBtn') as HTMLButtonElement;
    const switchCameraBtn = container.querySelector('#switchCameraBtn') as HTMLButtonElement;

    // Start video stream
    try {
      if (this.videoEl) {
        await this.camera.startCamera(this.videoEl);
        
        // Show flip lens button on mobile devices (multiple devices/cameras)
        if (this.hasMultipleCameras()) {
          switchCameraBtn.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('Failed to bind camera stream to viewfinder:', err);
      alert('Could not start video preview. Returning to landing.');
      this.onViewChange('landing');
      return;
    }

    // Shutter capture trigger
    shutterTriggerBtn?.addEventListener('click', () => {
      if (this.captureActive) return;
      this.audio.playTypewriter();
      this.startSequence(container);
    });

    cancelCaptureBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      this.destroy();
      this.onViewChange('landing');
    });

    switchCameraBtn?.addEventListener('click', async () => {
      if (this.captureActive || !this.videoEl) return;
      this.audio.playTypewriter();
      try {
        await this.camera.switchCamera(this.videoEl);
      } catch (err) {
        console.warn('Switch camera failed:', err);
      }
    });
  }

  // Check if camera flip button is relevant
  private hasMultipleCameras(): boolean {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return isMobile;
  }

  // Orchestrate the sequential capture timeline
  private async startSequence(container: HTMLElement) {
    this.captureActive = true;
    
    const shutterTriggerBtn = container.querySelector('#shutterTriggerBtn') as HTMLButtonElement;
    const switchCameraBtn = container.querySelector('#switchCameraBtn') as HTMLButtonElement;
    const boothInstructions = container.querySelector('#boothInstructions') as HTMLElement;
    const statusDot = container.querySelector('#statusDot') as HTMLElement;
    const statusLabel = container.querySelector('#statusLabel') as HTMLElement;
    const countdownOverlay = container.querySelector('#countdownOverlay') as HTMLElement;
    const countdownNumber = container.querySelector('#countdownNumber') as HTMLElement;
    const flashOverlay = document.getElementById('shutterFlash') as HTMLElement;

    // UI state updates
    shutterTriggerBtn.disabled = true;
    switchCameraBtn.disabled = true;
    statusDot.className = 'status-dot recording';
    statusLabel.innerText = 'Capturing';

    // Start running timecode
    let frames = 0;
    const updateTimecode = () => {
      frames++;
      const f = String(frames % 24).padStart(2, '0');
      const totalSecs = Math.floor(frames / 24);
      const s = String(totalSecs % 60).padStart(2, '0');
      const totalMins = Math.floor(totalSecs / 60);
      const m = String(totalMins % 60).padStart(2, '0');
      const h = String(Math.floor(totalMins / 60) % 24).padStart(1, '0');
      
      const tcEl = container.querySelector('#camTimecode');
      if (tcEl) {
        tcEl.textContent = `TC ${h}:${m}:${s}:${f}`;
      }
    };
    this.timecodeInterval = setInterval(updateTimecode, 41.67);

    // 3 shots instead of 4
    const numPhotos = 3;

    for (let frame = 0; frame < numPhotos; frame++) {
      if (!this.captureActive) break;

      // Pulse active frame bulb
      const currentBulb = container.querySelector(`#bulb-${frame}`) as HTMLElement;
      if (currentBulb) {
        currentBulb.className = 'indicator-bulb capturing';
      }

      boothInstructions.innerText = `Strike Pose ${frame + 1}!`;

      // 3-second countdown per frame
      const viewfinderLightLeak = container.querySelector('#viewfinderLightLeak') as HTMLElement;
      for (let count = 3; count >= 1; count--) {
        if (!this.captureActive) break;

        // Activate lens light leak during countdown
        viewfinderLightLeak?.classList.add('active');

        // Show countdown panel
        countdownOverlay.classList.add('active');
        countdownNumber.innerText = count.toString();
        
        // Reset animation class to re-trigger zoom
        countdownNumber.classList.remove('animate');
        void countdownNumber.offsetWidth; // force reflow
        countdownNumber.classList.add('animate');

        // Play countdown sound
        this.audio.playTick();

        // Wait 1 second
        await this.wait(1000);
      }

      if (!this.captureActive) break;

      // Take Photo (Count = 0)
      countdownOverlay.classList.remove('active');
      viewfinderLightLeak?.classList.remove('active');
      
      // Trigger camera shutter sound and flash overlay animation
      this.audio.playShutter();
      flashOverlay.classList.add('active');

      try {
        const dataUrl = this.camera.captureFrame();
        this.state.capturedFrames.push(dataUrl);

        // Turn frame bulb solid green
        if (currentBulb) {
          currentBulb.className = 'indicator-bulb active';
        }
      } catch (err) {
        console.error('Failed to capture frame:', err);
      }

      // Clear flash class after shutter animation speed (150ms)
      await this.wait(150);
      flashOverlay.classList.remove('active');

      boothInstructions.innerText = `Pose ${frame + 1} Captured`;

      // Pose transition delay (1.5 seconds)
      if (frame < numPhotos - 1) {
        await this.wait(1350);
      }
    }

    if (this.captureActive) {
      boothInstructions.innerText = 'Processing...';
      await this.wait(800);
      
      // Stop stream and go to customize workspace
      this.destroy();
      this.onViewChange('customize');
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.countdownTimeout = setTimeout(resolve, ms);
    });
  }

  // Deallocate resources, stop trackers, clear schedules
  public destroy() {
    this.captureActive = false;
    if (this.countdownTimeout) {
      clearTimeout(this.countdownTimeout);
      this.countdownTimeout = null;
    }
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
    if (this.timecodeInterval) {
      clearInterval(this.timecodeInterval);
      this.timecodeInterval = null;
    }
    this.camera.stopCamera();
    
    // Make sure flash is off
    const flashOverlay = document.getElementById('shutterFlash');
    if (flashOverlay) {
      flashOverlay.classList.remove('active');
    }
  }
}
