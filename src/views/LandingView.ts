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
 
              <!-- Drag-and-drop Coin Acceptor slot -->
              <div class="coin-acceptor-wrapper" style="margin-bottom: 24px;">
                <div class="coin-slot" id="coinSlot" title="Drag coin here to credit machine">
                  <div class="coin-slot-header">COIN ENTRY</div>
                  <div class="coin-slot-entry"></div>
                  <div class="coin-slot-val">1 ₱</div>
                </div>
                <div class="coin-quarter" id="quarterCoin" draggable="true" title="Drag to slot, or click to insert"></div>
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

    let coinCredited = false;

    // Start action
    const startAction = () => {
      if (!coinCredited) {
        // Auto credit coin if clicking curtain or direct start
        insertCoin();
        this.audio.playTypewriter();
        setTimeout(() => {
          proceedStart();
        }, 500);
      } else {
        this.audio.playTypewriter();
        proceedStart();
      }
    };

    const proceedStart = () => {
      if (this.state.boothMode === 'duet') {
        const roomCode = `room-${Math.random().toString(36).substring(2, 9)}`;
        this.state.duetRoomId = roomCode;
        this.state.duetRole = 'host';
        this.onViewChange('duet' as any);
      } else {
        this.onViewChange('camera-setup');
      }
    };

    const insertCoin = () => {
      if (coinCredited) return;
      coinCredited = true;
      this.audio.playCoinDrop();
      
      const coin = container.querySelector('#quarterCoin') as HTMLElement;
      const slot = container.querySelector('#coinSlot') as HTMLElement;

      if (coin) {
        coin.style.transform = 'translateY(30px) scale(0)';
        coin.style.opacity = '0';
        coin.style.transition = 'all 0.4s ease';
      }
      if (slot) {
        slot.classList.add('inserted');
      }

      setTimeout(() => {
        proceedStart();
      }, 700);
    };

    // Drag and Drop implementation
    const coinEl = container.querySelector('#quarterCoin') as HTMLElement;
    const slotEl = container.querySelector('#coinSlot') as HTMLElement;

    if (coinEl && slotEl) {
      coinEl.addEventListener('dragstart', (e: DragEvent) => {
        e.dataTransfer?.setData('text/plain', 'coin');
        this.audio.playTypewriter();
        coinEl.classList.add('dragging');
      });

      coinEl.addEventListener('dragend', () => {
        coinEl.classList.remove('dragging');
      });

      slotEl.addEventListener('dragover', (e: DragEvent) => {
        e.preventDefault();
        slotEl.classList.add('hover');
      });

      slotEl.addEventListener('dragleave', () => {
        slotEl.classList.remove('hover');
      });

      slotEl.addEventListener('drop', (e: DragEvent) => {
        e.preventDefault();
        slotEl.classList.remove('hover');
        const data = e.dataTransfer?.getData('text/plain');
        if (data === 'coin') {
          insertCoin();
        }
      });

      // Touch Drag & Drop for Mobile Devices
      let touchStartX = 0;
      let touchStartY = 0;
      let coinStartX = 0;
      let coinStartY = 0;
      let isTouchDragging = false;

      coinEl.addEventListener('touchstart', (e: TouchEvent) => {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        const rect = coinEl.getBoundingClientRect();
        coinStartX = rect.left;
        coinStartY = rect.top;
        isTouchDragging = true;
        coinEl.classList.add('dragging');
        this.audio.playTypewriter();
      }, { passive: true });

      coinEl.addEventListener('touchmove', (e: TouchEvent) => {
        if (!isTouchDragging) return;
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        
        coinEl.style.position = 'fixed';
        coinEl.style.left = `${coinStartX + dx}px`;
        coinEl.style.top = `${coinStartY + dy}px`;
        coinEl.style.zIndex = '9999';

        // Overlap check
        const slotRect = slotEl.getBoundingClientRect();
        if (
          touch.clientX >= slotRect.left &&
          touch.clientX <= slotRect.right &&
          touch.clientY >= slotRect.top &&
          touch.clientY <= slotRect.bottom
        ) {
          slotEl.classList.add('hover');
        } else {
          slotEl.classList.remove('hover');
        }
      }, { passive: true });

      coinEl.addEventListener('touchend', (e: TouchEvent) => {
        if (!isTouchDragging) return;
        isTouchDragging = false;
        coinEl.classList.remove('dragging');
        slotEl.classList.remove('hover');

        const touch = e.changedTouches[0];
        const slotRect = slotEl.getBoundingClientRect();

        if (
          touch.clientX >= slotRect.left &&
          touch.clientX <= slotRect.right &&
          touch.clientY >= slotRect.top &&
          touch.clientY <= slotRect.bottom
        ) {
          insertCoin();
        } else {
          coinEl.style.position = '';
          coinEl.style.left = '';
          coinEl.style.top = '';
          coinEl.style.zIndex = '';
        }
      });

      // Quick auto-insert click trigger
      coinEl.addEventListener('click', () => {
        insertCoin();
      });
      slotEl.addEventListener('click', () => {
        insertCoin();
      });
    }

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
