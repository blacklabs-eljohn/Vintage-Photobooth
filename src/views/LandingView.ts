import type { AppView, AppState } from '../types';
import { AudioManager } from '../components/AudioManager';
import leftImg from '../left.png';
import rightImg from '../right.png';

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
    if (!this.state.boothFormat) this.state.boothFormat = 'strip';
    if (!this.state.connectionMode) this.state.connectionMode = 'solo';

    const currentMode = this.state.connectionMode;

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
                <div class="tablet-format-slider" id="formatSlider">
                  <button class="slider-arrow arrow-left" id="formatPrevBtn" title="Previous Format">◀</button>
                  <div class="slider-viewport">
                    <div class="slider-track" id="formatTrack">
                      <div class="format-slide-card active-strip" data-format="strip" title="3-Shot Photostrip">🎞️ Strip</div>
                      <div class="format-slide-card active-polaroid" data-format="polaroid" title="1-Shot Polaroid">📸 Polaroid</div>
                      <div class="format-slide-card active-cinematic" data-format="cinematic" title="Landscape Cinematic Film">🎬 Cine</div>
                      <div class="format-slide-card active-postcard" data-format="postcard" title="2x2 Retro Postcard">🎴 Postcard</div>
                    </div>
                  </div>
                  <button class="slider-arrow arrow-right" id="formatNextBtn" title="Next Format">▶</button>
                </div>
                
                <span class="tablet-screen-title" style="margin-top: 6px;">Mode</span>
                <div class="toggle-switch-unit" id="modeToggle" title="Toggle Solo / Duet">
                  <div class="toggle-label-plate ${currentMode === 'solo' ? 'active' : ''}" id="togglePlateLeft">
                    <span class="led-dot"></span>👤 SOLO
                  </div>
                  <div class="toggle-switch-img-wrapper">
                    <img src="${currentMode === 'solo' ? leftImg : rightImg}" id="toggleSwitchImg" class="toggle-switch-img" alt="Toggle Switch" />
                  </div>
                  <div class="toggle-label-plate plate-right ${currentMode === 'duet' ? 'active' : ''}" id="togglePlateRight">
                    <span class="led-dot"></span>👥 DUET
                  </div>
                </div>
                <span class="mode-hint-text" id="modeHintText">${currentMode === 'duet' ? '🔗 Link a partner' : '📷 Just you'}</span>
                
                <span class="tablet-marquee" style="margin-top: 4px;">Tap to choose</span>
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
        <div class="coin-row-container" id="coinRowContainer">
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
    const tabletMarquee = container.querySelector('.tablet-marquee') as HTMLElement;

    const formatTrack = container.querySelector('#formatTrack') as HTMLElement;
    const formatPrevBtn = container.querySelector('#formatPrevBtn') as HTMLButtonElement;
    const formatNextBtn = container.querySelector('#formatNextBtn') as HTMLButtonElement;

    const modeToggle = container.querySelector('#modeToggle') as HTMLElement;
    const plateLeft = container.querySelector('#togglePlateLeft') as HTMLElement;
    const plateRight = container.querySelector('#togglePlateRight') as HTMLElement;
    const toggleSwitchImg = container.querySelector('#toggleSwitchImg') as HTMLImageElement;
    const modeHintText = container.querySelector('#modeHintText') as HTMLElement;

    const formats = ['strip', 'polaroid', 'cinematic', 'postcard'];
    let currentFmtIndex = formats.indexOf(this.state.boothFormat || 'strip');
    if (currentFmtIndex === -1) currentFmtIndex = 0;

    const syncStateAndMarquee = () => {
      const fmt = this.state.boothFormat || 'strip';
      const md = this.state.connectionMode || 'solo';
      
      // Update backwards compatible boothMode
      if (md === 'duet') {
        this.state.boothMode = 'duet';
      } else {
        this.state.boothMode = (fmt === 'polaroid' || fmt === 'cinematic') ? 'polaroid' : 'strip';
      }

      if (tabletMarquee) {
        const fmtLabel = fmt.charAt(0).toUpperCase() + fmt.slice(1);
        const mdLabel = md.charAt(0).toUpperCase() + md.slice(1);
        tabletMarquee.textContent = `▶ ${fmtLabel} (${mdLabel})`;
      }
    };

    const updateSliderUI = (animate = true) => {
      if (!formatTrack) return;
      if (!animate) {
        formatTrack.style.transition = 'none';
      } else {
        formatTrack.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
      }
      formatTrack.style.transform = `translateX(-${currentFmtIndex * 100}%)`;
      
      const cards = formatTrack.querySelectorAll('.format-slide-card');
      cards.forEach((card, idx) => {
        card.classList.toggle('active', idx === currentFmtIndex);
      });

      const newFmt = formats[currentFmtIndex];
      this.state.boothFormat = newFmt as any;
      syncStateAndMarquee();
    };

    // Bind slider arrow controls
    formatPrevBtn?.addEventListener('click', () => {
      currentFmtIndex = (currentFmtIndex - 1 + formats.length) % formats.length;
      this.audio.playBeep();
      updateSliderUI(true);
    });

    formatNextBtn?.addEventListener('click', () => {
      currentFmtIndex = (currentFmtIndex + 1) % formats.length;
      this.audio.playBeep();
      updateSliderUI(true);
    });

    // Initialize slider position
    updateSliderUI(false);

    // Bind vintage mode toggle
    const setMode = (newMode: 'solo' | 'duet') => {
      if (this.state.connectionMode === newMode) return;
      this.state.connectionMode = newMode;
      this.audio.playTypewriter();
      
      // Update toggle switch image and play visual feedback
      if (toggleSwitchImg) {
        toggleSwitchImg.src = newMode === 'solo' ? leftImg : rightImg;
        toggleSwitchImg.classList.add('pressed');
        setTimeout(() => toggleSwitchImg.classList.remove('pressed'), 150);
      }

      // Update plates
      plateLeft?.classList.toggle('active', newMode === 'solo');
      plateRight?.classList.toggle('active', newMode === 'duet');

      // Update hint text
      if (modeHintText) {
        modeHintText.textContent = newMode === 'duet' ? '🔗 Link a partner' : '📷 Just you';
        modeHintText.classList.toggle('duet', newMode === 'duet');
      }

      syncStateAndMarquee();
    };

    plateLeft?.addEventListener('click', (e) => {
      e.stopPropagation();
      setMode('solo');
    });

    plateRight?.addEventListener('click', (e) => {
      e.stopPropagation();
      setMode('duet');
    });

    modeToggle?.addEventListener('click', () => {
      const newMode = this.state.connectionMode === 'solo' ? 'duet' : 'solo';
      setMode(newMode);
    });

    let coinCredited = false;

    // Start action
    const startAction = () => {
      if (!coinCredited) {
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
      coinCredited = true;
      this.audio.playCoinDrop();
      
      const coin = container.querySelector('#quarterCoin') as HTMLElement;
      const slot = container.querySelector('#coinSlot') as HTMLElement;
      const helperText = container.querySelector('.coin-helper-text') as HTMLElement;

      if (coin) {
        // Calculate the physical offset between the coin and the entry slot dynamically
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
        proceedStart();
      }, 800);
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
