import type { AppView, AppState } from '../types';
import { AudioManager } from '../components/AudioManager';

export class LandingView implements AppView {
  private state: AppState;
  private audio: AudioManager;
  private onViewChange: (view: 'camera-setup' | 'customize') => void;
  private coinInserted: boolean = false;

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
    container.innerHTML = `
      <div class="view-panel">
        <div class="cabinet-wrapper">
          <!-- Neon photos header marquee -->
          <div class="neon-marquee">
            <h2 class="neon-text">Photos</h2>
          </div>

          <!-- The Physical Photobooth Cabinet facade -->
          <div class="booth-cabinet" id="cabinetBody">
            <!-- Left panel: Control Board (Arcade Button, Coin Slot, Dispenser) -->
            <div class="cabinet-panel-left">
              <!-- Coin slot door with LED credit screen -->
              <div class="coin-door-wrapper">
                <div class="arcade-led-display" id="coinLedDisplay">insert coin</div>
                <div class="coin-slot" id="coinSlotBtn" title="Insert Coin (Click to Insert)"></div>
                <div class="coin-return"></div>
              </div>

              <!-- Start Button -->
              <div class="arcade-start-button-wrapper">
                <button class="arcade-start-btn locked" id="arcadeStartBtn" title="Start Session"></button>
                <span class="arcade-btn-label">START</span>
              </div>

              <!-- Photo Dispenser tray -->
              <div class="paper-dispenser" title="Photo Strip Exit"></div>
            </div>

            <!-- Right panel: Draped curtains doorway (starts locked) -->
            <div class="cabinet-panel-right locked" id="cabinetCurtainDoor" title="Step Inside">
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
    const coinSlotBtn = container.querySelector('#coinSlotBtn') as HTMLElement;
    const coinLedDisplay = container.querySelector('#coinLedDisplay') as HTMLElement;
    const uploadPhotosBtn = container.querySelector('#uploadPhotosBtn');
    const hiddenFileInput = container.querySelector('#hiddenFileInput') as HTMLInputElement;

    // Insert Coin action
    coinSlotBtn?.addEventListener('click', () => {
      if (this.coinInserted) return;
      this.coinInserted = true;

      // Play arcade metallic coin drop chime
      this.audio.playCoinDrop();

      // Enable LED status and button animations
      if (coinLedDisplay) {
        coinLedDisplay.innerText = 'ready';
        coinLedDisplay.classList.add('ready');
      }
      arcadeStartBtn?.classList.remove('locked');
      cabinetCurtainDoor?.classList.remove('locked');
    });

    const startAction = () => {
      if (!this.coinInserted) {
        // Warning feedback: tick sound and shake coin door wrapper
        this.audio.playTick();
        
        const coinDoor = container.querySelector('.coin-door-wrapper');
        if (coinDoor) {
          coinDoor.classList.remove('shake-warning');
          void (coinDoor as HTMLElement).offsetWidth; // force reflow
          coinDoor.classList.add('shake-warning');
          setTimeout(() => coinDoor.classList.remove('shake-warning'), 500);
        }
        return;
      }
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

      if (files.length < 3) {
        alert('Please select at least 3 photos to generate a vintage photostrip.');
        return;
      }

      const numToLoad = Math.min(files.length, 3);
      const fileArray = Array.from(files).slice(0, numToLoad);

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
