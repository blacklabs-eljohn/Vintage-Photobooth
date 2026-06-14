import type { AppView, AppState } from '../types';
import { AudioManager } from '../components/AudioManager';

export class LandingView implements AppView {
  private state: AppState;
  private audio: AudioManager;
  private onViewChange: (view: 'camera-setup' | 'customize') => void;
  private activeStep: 'format' | 'coin' | 'mode' = 'format';

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
    this.state.boothFormat = undefined;
    this.state.connectionMode = undefined;

    // Reset step state back to format selection on initial render
    this.activeStep = 'format';

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
              <!-- Embedded Touchscreen Console (Calculator Style) -->
              <div class="cabinet-tablet-console calculator-console" id="tabletConsole">
                <!-- LCD Screen at the Top -->
                <div class="console-lcd-screen" id="consoleLcd">
                  <div class="lcd-line lcd-status">SYS READY</div>
                  <div class="lcd-line lcd-main">SELECT FORMAT</div>
                  <div class="lcd-line lcd-sub">[ 🎞️ 📸 🎬 🎴 ]</div>
                </div>
                
                <!-- Keypad below the Screen -->
                <div class="console-keypad" id="consoleKeypad">
                  <!-- Dynamic Keypad Buttons will be rendered here -->
                </div>
              </div>
 
              <!-- Centered Coin Acceptor slot -->
              <div class="coin-acceptor-wrapper" style="margin-bottom: 12px; width: 100%;">
                <div class="coin-slot" id="coinSlot" title="Drag coin here to credit machine" style="margin: 0 auto;">
                  <div class="coin-slot-header">COIN ENTRY</div>
                  <div class="coin-slot-entry"></div>
                  <div class="coin-slot-val">1 ₱</div>
                </div>
              </div>
 
              <!-- File Intake Slot (Uploader) -->
              <div class="cabinet-file-slot" id="fileIntakeSlot" title="Insert Digital Negatives (Upload)">
                <span class="file-slot-label">UPLOAD FILE</span>
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

        <!-- Centered coin row container -->
        <div class="coin-row-container locked" id="coinRowContainer">
          <div class="coin-helper-text">
            <span>Insert the coin</span>
            <svg width="20" height="16" viewBox="0 0 24 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <div class="coin-quarter" id="quarterCoin" draggable="true" title="Drag me to the slot or click to insert"></div>
        </div>
      </div>
    `;

    // Hook elements
    const cabinetCurtainDoor = container.querySelector('#cabinetCurtainDoor') as HTMLElement;
    const fileIntakeSlot = container.querySelector('#fileIntakeSlot');
    const hiddenFileInput = container.querySelector('#hiddenFileInput') as HTMLInputElement;

    const consoleLcd = container.querySelector('#consoleLcd') as HTMLElement;
    const consoleKeypad = container.querySelector('#consoleKeypad') as HTMLElement;
    const coinRowContainer = container.querySelector('#coinRowContainer') as HTMLElement;

    const syncBackwardsCompatibleMode = () => {
      const fmt = this.state.boothFormat || 'strip';
      const md = this.state.connectionMode || 'solo';
      
      if (md === 'duet') {
        this.state.boothMode = 'duet';
      } else {
        this.state.boothMode = (fmt === 'polaroid' || fmt === 'cinematic') ? 'polaroid' : 'strip';
      }
    };

    const updateConsole = () => {
      if (!consoleLcd || !consoleKeypad) return;

      const fmt = this.state.boothFormat;
      const md = this.state.connectionMode;

      // 1. Render LCD Screen contents
      if (this.activeStep === 'format') {
        consoleLcd.innerHTML = `
          <div class="lcd-line lcd-status">SYS READY</div>
          <div class="lcd-line lcd-main">SELECT FORMAT</div>
          <div class="lcd-line lcd-sub">[ 🎞️ 📸 🎬 🎴 ]</div>
        `;
        if (coinRowContainer) {
          coinRowContainer.classList.add('locked');
          coinRowContainer.classList.remove('active');
        }
      } else if (this.activeStep === 'coin') {
        consoleLcd.innerHTML = `
          <div class="lcd-line lcd-status flash-warn">CREDIT REQUIRED</div>
          <div class="lcd-line lcd-main">INSERT 1 ₱ COIN</div>
          <div class="lcd-line lcd-sub">> FMT: ${fmt ? fmt.toUpperCase() : ''}</div>
        `;
        if (coinRowContainer) {
          coinRowContainer.classList.remove('locked');
          coinRowContainer.classList.add('active');
        }
      } else if (this.activeStep === 'mode') {
        consoleLcd.innerHTML = `
          <div class="lcd-line lcd-status">CREDIT: 1 ₱ OK</div>
          <div class="lcd-line lcd-main">SELECT MODE</div>
          <div class="lcd-line lcd-sub">> FMT: ${fmt ? fmt.toUpperCase() : ''}</div>
        `;
        if (coinRowContainer) {
          coinRowContainer.classList.add('locked');
          coinRowContainer.classList.remove('active');
        }
      }

      // 2. Render Keypad panel buttons dynamically
      if (this.activeStep === 'format' || this.activeStep === 'coin') {
        consoleKeypad.innerHTML = `
          <button class="keypad-btn fmt-btn ${fmt === 'strip' ? 'active' : ''}" data-format="strip">
            <span class="led-dot"></span>
            <span class="btn-text">🎞️ STRIP</span>
          </button>
          <button class="keypad-btn fmt-btn ${fmt === 'polaroid' ? 'active' : ''}" data-format="polaroid">
            <span class="led-dot"></span>
            <span class="btn-text">📸 POLAROID</span>
          </button>
          <button class="keypad-btn fmt-btn ${fmt === 'cinematic' ? 'active' : ''}" data-format="cinematic">
            <span class="led-dot"></span>
            <span class="btn-text">🎬 CINE</span>
          </button>
          <button class="keypad-btn fmt-btn ${fmt === 'postcard' ? 'active' : ''}" data-format="postcard">
            <span class="led-dot"></span>
            <span class="btn-text">🎴 POSTCARD</span>
          </button>
        `;

        // Bind format button clicks
        const keys = consoleKeypad.querySelectorAll('.fmt-btn');
        keys.forEach(key => {
          key.addEventListener('click', () => {
            const chosenFmt = key.getAttribute('data-format') as any;
            this.state.boothFormat = chosenFmt;
            this.audio.playBeep();

            // Tactile pressed visual loop
            key.classList.add('pressed');
            setTimeout(() => key.classList.remove('pressed'), 150);

            // Advance flow step to coin entry
            this.activeStep = 'coin';
            syncBackwardsCompatibleMode();
            updateConsole();
          });
        });
      } else if (this.activeStep === 'mode') {
        consoleKeypad.innerHTML = `
          <button class="keypad-btn mode-btn ${md === 'solo' ? 'active' : ''}" data-mode="solo">
            <span class="led-dot"></span>
            <span class="btn-text">👤 SOLO</span>
          </button>
          <button class="keypad-btn mode-btn ${md === 'duet' ? 'active' : ''}" data-mode="duet">
            <span class="led-dot"></span>
            <span class="btn-text">👥 DUET</span>
          </button>
        `;

        // Bind mode button clicks
        const keys = consoleKeypad.querySelectorAll('.mode-btn');
        keys.forEach(key => {
          key.addEventListener('click', () => {
            const chosenMode = key.getAttribute('data-mode') as any;
            this.state.connectionMode = chosenMode;
            this.audio.playTypewriter();

            key.classList.add('pressed');
            setTimeout(() => {
              key.classList.remove('pressed');
              proceedStart();
            }, 180);
          });
        });
      }
    };

    let coinCredited = false;

    // Start action via Curtains
    const startAction = () => {
      if (this.activeStep === 'format') {
        this.audio.playBeep();
        const lcdMain = container.querySelector('.lcd-main') as HTMLElement;
        if (lcdMain) {
          lcdMain.classList.add('flash-warn');
          setTimeout(() => lcdMain.classList.remove('flash-warn'), 600);
        }
        return;
      }

      if (!coinCredited) {
        insertCoin();
      } else {
        if (this.activeStep === 'mode') {
          this.audio.playTypewriter();
          proceedStart();
        }
      }
    };

    const proceedStart = () => {
      if (this.state.connectionMode === 'duet') {
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
      if (this.activeStep !== 'coin') {
        this.audio.playBeep();
        return;
      }

      coinCredited = true;
      this.audio.playCoinDrop();
      
      const coin = container.querySelector('#quarterCoin') as HTMLElement;
      const slot = container.querySelector('#coinSlot') as HTMLElement;
      const helperText = container.querySelector('.coin-helper-text') as HTMLElement;

      if (coin) {
        const coinRect = coin.getBoundingClientRect();
        const slotRect = slot.getBoundingClientRect();
        const deltaX = slotRect.left + slotRect.width / 2 - (coinRect.left + coinRect.width / 2);
        const deltaY = slotRect.top + slotRect.height / 2 - (coinRect.top + coinRect.height / 2);

        coin.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.25) rotate(360deg)`;
        coin.style.opacity = '0';
        coin.style.transition = 'all 0.8s cubic-bezier(0.25, 1, 0.5, 1)';
      }
      if (helperText) {
        helperText.style.opacity = '0';
        helperText.style.transform = 'translateX(-15px)';
        helperText.style.transition = 'all 0.4s ease';
      }
      if (slot) {
        slot.classList.add('inserted');
      }

      setTimeout(() => {
        this.activeStep = 'mode';
        updateConsole();
      }, 800);
    };

    // Initialize the console UI
    updateConsole();

    // Drag and Drop handlers
    const coinEl = container.querySelector('#quarterCoin') as HTMLElement;
    const slotEl = container.querySelector('#coinSlot') as HTMLElement;

    if (coinEl && slotEl) {
      coinEl.addEventListener('dragstart', (e: DragEvent) => {
        if (this.activeStep !== 'coin') {
          e.preventDefault();
          this.audio.playBeep();
          return;
        }
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
        if (this.activeStep !== 'coin') {
          this.audio.playBeep();
          return;
        }
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
        if (this.activeStep !== 'coin') {
          this.audio.playBeep();
          return;
        }
        insertCoin();
      });
      slotEl.addEventListener('click', () => {
        if (this.activeStep !== 'coin') {
          this.audio.playBeep();
          return;
        }
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
