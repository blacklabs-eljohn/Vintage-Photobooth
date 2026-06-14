import type { AppView, AppState } from '../types';
import { AudioManager } from '../components/AudioManager';
import { CameraManager } from '../components/CameraManager';

export class CameraSetupView implements AppView {
  private state: AppState;
  private audio: AudioManager;
  private camera: CameraManager;
  private onViewChange: (view: 'landing' | 'capture' | 'customize') => void;
  private timeoutId: any = null;

  constructor(
    state: AppState,
    audio: AudioManager,
    camera: CameraManager,
    onViewChange: (view: 'landing' | 'capture' | 'customize') => void
  ) {
    this.state = state;
    this.audio = audio;
    this.camera = camera;
    this.onViewChange = onViewChange;
  }

  public render(container: HTMLElement) {
    container.innerHTML = `
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
                <!-- 6 aperture blades structure -->
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
          <div class="console-actions">
            <!-- Setup Request State -->
            <div class="console-panel-state" id="setupRequestState">
              <p class="console-help-text">
                To capture your retro moments, please authorize lens access. Processed locally, never stored.
              </p>
              <button id="grantPermissionBtn" class="btn-primary console-btn-primary">ACTIVATE LENS</button>
              <button id="backToHomeBtn" class="btn-secondary console-btn-secondary">ABORT</button>
            </div>
            
            <!-- Setup Denied State -->
            <div class="console-panel-state" id="setupDeniedState" style="display: none;">
              <p class="console-help-text text-danger">
                Camera access was blocked or is unsupported. Insert digital files to proceed.
              </p>
              <button id="uploadInsteadBtn" class="btn-primary console-btn-upload">INSERT PHOTOS</button>
              <div class="console-action-row">
                <button id="retryPermissionBtn" class="btn-secondary console-btn-secondary">RETRY LENS</button>
                <button id="backToHomeDeniedBtn" class="btn-secondary console-btn-secondary">ABORT</button>
              </div>
              <input type="file" id="setupFileInput" class="hidden-file-input" multiple accept="image/*" />
            </div>
          </div>
        </div>
      </div>
    `;

    const requestCard = container.querySelector('#setupRequestState') as HTMLElement;
    const deniedCard = container.querySelector('#setupDeniedState') as HTMLElement;

    const statusLed = container.querySelector('#statusLed') as HTMLElement;
    const statusLabel = container.querySelector('#statusLabel') as HTMLElement;
    const tickerText = container.querySelector('#tickerText') as HTMLElement;
    const lensAperture = container.querySelector('#lensAperture') as HTMLElement;

    const grantPermissionBtn = container.querySelector('#grantPermissionBtn');
    const backToHomeBtn = container.querySelector('#backToHomeBtn');
    
    const uploadInsteadBtn = container.querySelector('#uploadInsteadBtn');
    const retryPermissionBtn = container.querySelector('#retryPermissionBtn');
    const backToHomeDeniedBtn = container.querySelector('#backToHomeDeniedBtn');
    const setupFileInput = container.querySelector('#setupFileInput') as HTMLInputElement;

    const setStatus = (state: 'loading' | 'connecting' | 'online' | 'blocked') => {
      if (!statusLed || !statusLabel || !tickerText) return;

      statusLed.className = 'status-led'; // Reset classes
      
      if (state === 'loading') {
        statusLed.classList.add('status-yellow');
        statusLabel.textContent = 'LENS STANDBY';
        tickerText.textContent = 'INITIALIZING SHUTTER SYSTEM...';
      } else if (state === 'connecting') {
        statusLed.classList.add('status-yellow');
        statusLabel.textContent = 'CONNECTING';
        tickerText.textContent = 'REQUESTING SHUTTER ACCESS...';
        if (lensAperture) lensAperture.style.transform = 'rotate(25deg)';
      } else if (state === 'online') {
        statusLed.classList.add('status-green');
        statusLabel.textContent = 'LENS ONLINE';
        tickerText.textContent = 'ACCESS GRANTED - SHUTTER OPEN';
        if (lensAperture) lensAperture.style.transform = 'rotate(90deg)';
      } else if (state === 'blocked') {
        statusLed.classList.add('status-red');
        statusLabel.textContent = 'LENS BLOCKED';
        tickerText.textContent = '⚠️ SHUTTER BLOCKED - INSERT PHOTOS OR RETRY';
        if (lensAperture) lensAperture.style.transform = 'rotate(0deg)';
      }
    };

    // Helper to start the camera stream and verify it works
    const attemptCameraAccess = async () => {
      setStatus('connecting');
      
      const tempVideo = document.createElement('video');
      tempVideo.style.display = 'none';
      document.body.appendChild(tempVideo);

      try {
        await this.camera.startCamera(tempVideo);
        this.camera.stopCamera();
        tempVideo.remove();
        
        setStatus('online');
        this.audio.playBeep();
        
        // Small delay for clean visual transition
        this.timeoutId = setTimeout(() => {
          this.onViewChange('capture');
        }, 600);
      } catch (err) {
        console.warn('Camera permission denied or failed:', err);
        tempVideo.remove();
        
        setStatus('blocked');
        if (requestCard) requestCard.style.display = 'none';
        if (deniedCard) deniedCard.style.display = 'flex';
      }
    };

    grantPermissionBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      attemptCameraAccess();
    });

    backToHomeBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      this.onViewChange('landing');
    });

    retryPermissionBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      attemptCameraAccess();
    });

    backToHomeDeniedBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      this.onViewChange('landing');
    });

    uploadInsteadBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      setupFileInput?.click();
    });

    setupFileInput?.addEventListener('change', async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      const format = this.state.boothFormat || 'strip';
      let minRequired = 3;
      let formatLabel = 'vintage photostrip';
      
      if (format === 'polaroid' || format === 'cinematic') {
        minRequired = 1;
        formatLabel = format === 'polaroid' ? 'Polaroid' : 'Cinematic film';
      } else if (format === 'postcard') {
        minRequired = 4;
        formatLabel = 'Retro Postcard';
      }

      if (files.length < minRequired) {
        alert(`Please select at least ${minRequired} photo${minRequired > 1 ? 's' : ''} to generate a ${formatLabel}.`);
        return;
      }

      const fileArray = Array.from(files).slice(0, minRequired);

      try {
        const loadedUrls = await Promise.all(
          fileArray.map(file => this.readFileAsDataUrl(file))
        );
        this.state.capturedFrames = loadedUrls;
        this.onViewChange('customize');
      } catch (err) {
        console.error('Failed to load uploaded photos:', err);
        alert('Failed to read photos. Please try again with valid image files.');
      }
    });

    // Start auto-access check after a brief delay so the page transitions first
    setStatus('loading');
    this.timeoutId = setTimeout(() => {
      attemptCameraAccess();
    }, 800);
  }

  public destroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }
}
