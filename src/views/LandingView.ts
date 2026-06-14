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
    const isPolaroid = this.state.boothMode === 'polaroid';
    const isDuet = this.state.boothMode === 'duet';

    container.innerHTML = `
      <div class="view-panel">
        <div class="cabinet-wrapper">
          <!-- Neon photos header marquee -->
          <div class="neon-marquee">
            <h2 class="neon-text">Photobooth</h2>
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
                  <button class="tablet-mode-card ${isPolaroid ? 'active-polaroid' : ''}" id="modePolaroidBtn" title="1-Shot Polaroid">📸 Polaroid</button>
                  <button class="tablet-mode-card ${isDuet ? 'active-duet' : ''}" id="modeDuetBtn" title="LDR Partner Duet">👥 Duet Link</button>
                </div>
                <span class="tablet-marquee">Tap to choose</span>
              </div>
 
              <!-- Start Button -->
              <div class="arcade-start-button-wrapper">
                <button class="arcade-start-btn" id="arcadeStartBtn" title="Start Session"></button>
                <span class="arcade-btn-label">START</span>
              </div>
 
              <!-- File Intake Slot (Uploader) at the bottom -->
              <div class="cabinet-file-slot" id="fileIntakeSlot" title="Insert Digital Negatives (Upload)">
                <span class="file-slot-label">FILE INTAKE</span>
                <div class="file-slot-mouth"></div>
              </div>
            </div>
 
            <!-- Right panel: Draped curtains doorway -->
            <div class="cabinet-panel-right" id="cabinetCurtainDoor" title="Step Inside">
              <div class="cabinet-curtain"></div>
              <div class="booth-shadow-bottom"></div>
            </div>
          </div>
          
          <input type="file" id="hiddenFileInput" class="hidden-file-input" multiple accept="image/*" />
        </div>
      </div>
    `;

    // Hook elements
    const arcadeStartBtn = container.querySelector('#arcadeStartBtn') as HTMLButtonElement;
    const cabinetCurtainDoor = container.querySelector('#cabinetCurtainDoor') as HTMLElement;
    const fileIntakeSlot = container.querySelector('#fileIntakeSlot');
    const hiddenFileInput = container.querySelector('#hiddenFileInput') as HTMLInputElement;
    const tabletMarquee = container.querySelector('.tablet-marquee') as HTMLElement;

    const modeStripBtn = container.querySelector('#modeStripBtn') as HTMLButtonElement;
    const modePolaroidBtn = container.querySelector('#modePolaroidBtn') as HTMLButtonElement;
    const modeDuetBtn = container.querySelector('#modeDuetBtn') as HTMLButtonElement;

    // Mode Selector actions on the tablet console
    modeStripBtn?.addEventListener('click', () => {
      if (this.state.boothMode === 'strip') return;
      this.audio.playBeep();
      this.state.boothMode = 'strip';
      modeStripBtn.classList.add('active-strip');
      modePolaroidBtn.classList.remove('active-polaroid');
      modeDuetBtn.classList.remove('active-duet');
      if (tabletMarquee) tabletMarquee.textContent = '▶ Strip ready';
    });

    modePolaroidBtn?.addEventListener('click', () => {
      if (this.state.boothMode === 'polaroid') return;
      this.audio.playBeep();
      this.state.boothMode = 'polaroid';
      modePolaroidBtn.classList.add('active-polaroid');
      modeStripBtn.classList.remove('active-strip');
      modeDuetBtn.classList.remove('active-duet');
      if (tabletMarquee) tabletMarquee.textContent = '▶ Polaroid ready';
    });

    modeDuetBtn?.addEventListener('click', () => {
      if (this.state.boothMode === 'duet') return;
      this.audio.playBeep();
      this.state.boothMode = 'duet';
      modeDuetBtn.classList.add('active-duet');
      modeStripBtn.classList.remove('active-strip');
      modePolaroidBtn.classList.remove('active-polaroid');
      if (tabletMarquee) tabletMarquee.textContent = '▶ Duet ready';
    });

    // Start action — always available
    const startAction = () => {
      if (this.state.boothMode === 'duet') {
        this.audio.playCoinDrop(); // Play arcade coin sound
        const roomCode = `room-${Math.random().toString(36).substring(2, 9)}`;
        this.state.duetRoomId = roomCode;
        this.state.duetRole = 'host';
        this.onViewChange('duet' as any);
      } else {
        this.audio.playTypewriter();
        this.onViewChange('camera-setup');
      }
    };

    arcadeStartBtn?.addEventListener('click', startAction);
    cabinetCurtainDoor?.addEventListener('click', startAction);

    fileIntakeSlot?.addEventListener('click', () => {
      this.audio.playTypewriter();
      hiddenFileInput?.click();
    });

    hiddenFileInput?.addEventListener('change', async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      const isPolaroid = this.state.boothMode === 'polaroid';
      // Reset duet selection to classic strip upon digital upload triggers
      if (this.state.boothMode === 'duet') {
        this.state.boothMode = 'strip';
      }
      
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
