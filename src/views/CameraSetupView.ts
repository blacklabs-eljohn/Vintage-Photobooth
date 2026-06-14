import type { AppView, AppState } from '../types';
import { AudioManager } from '../components/AudioManager';
import { CameraManager } from '../components/CameraManager';

export class CameraSetupView implements AppView {
  private state: AppState;
  private audio: AudioManager;
  private camera: CameraManager;
  private onViewChange: (view: 'landing' | 'capture' | 'customize') => void;

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
        <div class="camera-setup-card" id="setupRequestCard">
          <div class="icon-camera-retro">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
          </div>
          <h2 class="setup-title">Adjust the Lens</h2>
          <p class="setup-desc">
            To take photos in the booth, we need permission to use your camera. 
            Your images are processed locally on your device and are never saved to the cloud.
          </p>
          <div class="setup-actions">
            <button id="grantPermissionBtn" class="btn-primary">Enable Camera Access</button>
            <button id="backToHomeBtn" class="btn-secondary">Go Back</button>
          </div>
        </div>

        <div class="camera-setup-card" id="setupDeniedCard" style="display: none;">
          <div class="icon-camera-retro" style="color: #ef4444;">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v5.5"/><circle cx="12" cy="13" r="3"/></svg>
          </div>
          <h2 class="setup-title">Camera Blocked</h2>
          <p class="setup-desc">
            It looks like camera access was denied or isn't supported on this device. 
            No worries! You can still create beautiful vintage strips by uploading your existing digital files.
          </p>
          <div class="setup-actions">
            <button id="uploadInsteadBtn" class="btn-primary">Upload Photos</button>
            <button id="retryPermissionBtn" class="btn-secondary">Retry Camera Access</button>
            <button id="backToHomeDeniedBtn" class="btn-secondary">Go Back</button>
            <input type="file" id="setupFileInput" class="hidden-file-input" multiple accept="image/*" />
          </div>
        </div>
      </div>
    `;

    const requestCard = container.querySelector('#setupRequestCard') as HTMLElement;
    const deniedCard = container.querySelector('#setupDeniedCard') as HTMLElement;

    const grantPermissionBtn = container.querySelector('#grantPermissionBtn');
    const backToHomeBtn = container.querySelector('#backToHomeBtn');
    
    const uploadInsteadBtn = container.querySelector('#uploadInsteadBtn');
    const retryPermissionBtn = container.querySelector('#retryPermissionBtn');
    const backToHomeDeniedBtn = container.querySelector('#backToHomeDeniedBtn');
    const setupFileInput = container.querySelector('#setupFileInput') as HTMLInputElement;

    // Helper to start the camera stream and verify it works
    const attemptCameraAccess = async () => {
      const tempVideo = document.createElement('video');
      tempVideo.style.display = 'none';
      document.body.appendChild(tempVideo);

      try {
        await this.camera.startCamera(tempVideo);
        this.camera.stopCamera();
        tempVideo.remove();
        this.onViewChange('capture');
      } catch (err) {
        console.warn('Camera permission denied or failed:', err);
        tempVideo.remove();
        requestCard.style.display = 'none';
        deniedCard.style.display = 'block';
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

      if (files.length < 3) {
        alert('Please select at least 3 photos to generate a vintage photostrip.');
        return;
      }

      // Limit to 3 photos (as user requested 3 shots)
      const numToLoad = Math.min(files.length, 3);
      const fileArray = Array.from(files).slice(0, numToLoad);

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
