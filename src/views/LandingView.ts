import type { AppView, AppState } from '../types';
import { AudioManager } from '../components/AudioManager';

export class LandingView implements AppView {
  private state: AppState;
  private audio: AudioManager;
  private onViewChange: (view: 'camera-setup' | 'customize') => void;

  constructor(
    state: AppState,
    audio: AudioManager,
    onViewChange: (view: 'camera-setup' | 'customize') => void
  ) {
    this.state = state;
    this.audio = audio;
    this.onViewChange = onViewChange;
  }

  public render(container: HTMLElement) {
    const isStrip = this.state.boothMode === 'strip';

    container.innerHTML = `
      <div class="view-panel">
        <div class="cabinet-wrapper">
          <!-- Neon photos header marquee -->
          <div class="neon-marquee">
            <h2 class="neon-text">Photos</h2>
          </div>
 
          <!-- The Physical Photobooth Cabinet facade -->
          <div class="booth-cabinet" id="cabinetBody">
            <!-- Left panel: Control Board (Tablet Console, Start Button, Dispenser) -->
            <div class="cabinet-panel-left">
              <!-- Embedded Touchscreen Console -->
              <div class="cabinet-tablet-console" id="tabletConsole">
                <span class="tablet-screen-title">Select Mode</span>
                <div class="tablet-mode-cards">
                  <button class="tablet-mode-card ${isStrip ? 'active-strip' : ''}" id="modeStripBtn" title="3-Shot Photostrip">🎞️ Strip</button>
                  <button class="tablet-mode-card ${!isStrip ? 'active-polaroid' : ''}" id="modePolaroidBtn" title="1-Shot Polaroid">📸 Polaroid</button>
                </div>
                <span class="tablet-marquee">Tap to choose</span>
              </div>
 
              <!-- Start Button -->
              <div class="arcade-start-button-wrapper">
                <button class="arcade-start-btn" id="arcadeStartBtn" title="Start Session"></button>
                <span class="arcade-btn-label">START</span>
              </div>
 
              <!-- Photo Dispenser tray -->
              <div class="paper-dispenser" title="Photo Strip Exit"></div>
            </div>
 
            <!-- Right panel: Draped curtains doorway -->
            <div class="cabinet-panel-right" id="cabinetCurtainDoor" title="Step Inside">
              <div class="cabinet-curtain"></div>
              <div class="booth-shadow-bottom"></div>
            </div>
          </div>
 
          <!-- Uploader Button -->
          <button id="uploadPhotosBtn" class="btn-secondary cabinet-uploader-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Upload Photos Instead
          </button>
          
          <input type="file" id="hiddenFileInput" class="hidden-file-input" multiple accept="image/*" />
        </div>
      </div>
    `;
 
    // Hook elements
    const arcadeStartBtn = container.querySelector('#arcadeStartBtn') as HTMLButtonElement;
    const cabinetCurtainDoor = container.querySelector('#cabinetCurtainDoor') as HTMLElement;
    const uploadPhotosBtn = container.querySelector('#uploadPhotosBtn');
    const hiddenFileInput = container.querySelector('#hiddenFileInput') as HTMLInputElement;
    const tabletMarquee = container.querySelector('.tablet-marquee') as HTMLElement;

    const modeStripBtn = container.querySelector('#modeStripBtn') as HTMLButtonElement;
    const modePolaroidBtn = container.querySelector('#modePolaroidBtn') as HTMLButtonElement;

    // Mode Selector actions on the tablet console
    modeStripBtn?.addEventListener('click', () => {
      if (this.state.boothMode === 'strip') return;
      this.audio.playBeep();
      this.state.boothMode = 'strip';
      modeStripBtn.classList.add('active-strip');
      modePolaroidBtn.classList.remove('active-polaroid');
      if (tabletMarquee) tabletMarquee.textContent = '▶ Strip ready';
    });

    modePolaroidBtn?.addEventListener('click', () => {
      if (this.state.boothMode === 'polaroid') return;
      this.audio.playBeep();
      this.state.boothMode = 'polaroid';
      modePolaroidBtn.classList.add('active-polaroid');
      modeStripBtn.classList.remove('active-strip');
      if (tabletMarquee) tabletMarquee.textContent = '▶ Polaroid ready';
    });
 
    // Start action — always available (no coin gate)
    const startAction = () => {
      this.audio.playTypewriter();
      this.onViewChange('camera-setup');
    };
 
    arcadeStartBtn?.addEventListener('click', startAction);
    cabinetCurtainDoor?.addEventListener('click', startAction);
 
    uploadPhotosBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      hiddenFileInput?.click();
    });
 
    hiddenFileInput?.addEventListener('change', async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
 
      const isPolaroid = this.state.boothMode === 'polaroid';
      const minRequired = isPolaroid ? 1 : 3;

      if (files.length < minRequired) {
        alert(isPolaroid
          ? 'Please select at least 1 photo to generate a Polaroid.'
          : 'Please select at least 3 photos to generate a vintage photostrip.'
        );
        return;
      }
 
      const fileArray = Array.from(files).slice(0, minRequired);
 
      try {
        const loadedUrls = await Promise.all(
          fileArray.map(file => this.readFileAsDataUrl(file))
        );
        
        // Update state
        this.state.capturedFrames = loadedUrls;
        
        // Go directly to customize
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
