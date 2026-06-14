import type { AppView, AppState } from '../types';
import { AudioManager } from '../components/AudioManager';
import { VINTAGE_THEMES, ThemeManager } from '../components/ThemeManager';
import { StripGenerator } from '../components/StripGenerator';

export class CustomizeView implements AppView {
  private state: AppState;
  private audio: AudioManager;
  private onViewChange: (view: 'result' | 'landing') => void;

  constructor(
    state: AppState,
    audio: AudioManager,
    onViewChange: (view: 'result' | 'landing') => void
  ) {
    this.state = state;
    this.audio = audio;
    this.onViewChange = onViewChange;
  }

  public render(container: HTMLElement) {
    // Set default date if empty
    if (!this.state.stripSettings.dateStr) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      this.state.stripSettings.dateStr = `${year}.${month}.${day}`;
    }

    const photos = this.state.capturedFrames;
    if (photos.length === 0) {
      this.onViewChange('landing');
      return;
    }

    // Build the frames HTML for preview
    let framesHtml = '';
    photos.forEach((photoUrl) => {
      framesHtml += `
        <div class="photostrip-frame">
          <img src="${photoUrl}" class="preview-img theme-${this.state.stripSettings.themeId}" alt="Captured frame" />
          <div class="light-leak-overlay" style="display: ${this.state.stripSettings.lightLeaks ? 'block' : 'none'};"></div>
          <div class="scratches-overlay" style="display: ${this.state.stripSettings.dustAndScratches ? 'block' : 'none'};"></div>
        </div>
      `;
    });

    container.innerHTML = `
      <div class="view-panel" id="customizeWorkspace">
        <div class="workspace-layout">
          <!-- Live Visual Preview -->
          <div class="preview-container">
            <h2 class="panel-title" style="margin-bottom: 8px; font-family: var(--font-sans); font-size: 0.9rem; color: hsl(var(--text-muted)); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Live Preview</h2>
            
            <div class="photostrip-paper strip-border-${this.state.stripSettings.borderStyle}" id="stripPreviewPaper">
              ${framesHtml}
              
              <div class="photostrip-footer">
                <p class="photostrip-caption" id="previewCaption">${this.state.stripSettings.caption || ''}</p>
                <div class="photostrip-meta">
                  <span class="photostrip-location" id="previewLocation">${this.state.stripSettings.location ? '📍 ' + this.state.stripSettings.location : ''}</span>
                  <span class="photostrip-date" id="previewDate" style="display: ${this.state.stripSettings.showDate ? 'inline' : 'none'};">${this.state.stripSettings.dateStr}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Creative Control Panel -->
          <div class="control-panel">
            <!-- Section 1: Themes -->
            <div class="panel-section">
              <h3 class="panel-title">1. Select Filter Theme</h3>
              <div class="theme-grid">
                ${VINTAGE_THEMES.map((theme) => `
                  <div class="theme-option ${this.state.stripSettings.themeId === theme.id ? 'active' : ''}" data-theme-id="${theme.id}">
                    <div class="theme-preview-dot" style="background-color: ${theme.dotColor};"></div>
                    <span class="theme-name">${theme.name}</span>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Section 2: Card Border Styles -->
            <div class="panel-section">
              <h3 class="panel-title">2. Card Border Background</h3>
              <div class="style-grid">
                <div class="style-option ${this.state.stripSettings.borderStyle === 'classic' ? 'active' : ''}" data-style="classic">Classic White</div>
                <div class="style-option ${this.state.stripSettings.borderStyle === 'warm' ? 'active' : ''}" data-style="warm">Warm Cream</div>
                <div class="style-option ${this.state.stripSettings.borderStyle === 'charcoal' ? 'active' : ''}" data-style="charcoal">Charcoal</div>
                <div class="style-option ${this.state.stripSettings.borderStyle === 'cardboard' ? 'active' : ''}" data-style="cardboard">Cardboard</div>
                <div class="style-option ${this.state.stripSettings.borderStyle === 'disco' ? 'active' : ''}" data-style="disco">Retro Stripes</div>
              </div>
            </div>

            <!-- Section 3: Captions & Customizations -->
            <div class="panel-section">
              <h3 class="panel-title">3. Personalized Inscriptions</h3>
              
              <div class="form-group">
                <label class="form-label" for="captionInput">Custom Note / Caption</label>
                <input type="text" id="captionInput" class="form-input" maxlength="45" value="${this.state.stripSettings.caption || ''}" placeholder="Write something nostalgic..." />
              </div>

              <div class="form-group">
                <label class="form-label" for="locationInput">Location Text</label>
                <input type="text" id="locationInput" class="form-input" maxlength="25" value="${this.state.stripSettings.location || ''}" placeholder="e.g. In the room, Paris..." />
              </div>

              <div class="toggle-group" style="margin-top: 12px;">
                <span class="form-label">Include Date Stamp</span>
                <input type="checkbox" id="showDateToggle" style="transform: scale(1.15); cursor: pointer;" ${this.state.stripSettings.showDate ? 'checked' : ''} />
              </div>

              <div class="form-group" id="dateInputGroup" style="display: ${this.state.stripSettings.showDate ? 'flex' : 'none'};">
                <label class="form-label" for="dateInput">Date Stamp Format</label>
                <input type="text" id="dateInput" class="form-input" maxlength="15" value="${this.state.stripSettings.dateStr}" />
              </div>

              <div class="toggle-group" style="margin-top: 12px; border-top: 1px dashed hsl(var(--border-warm)); padding-top: 12px;">
                <span class="form-label">Expose Light Leaks</span>
                <input type="checkbox" id="lightLeaksToggle" style="transform: scale(1.15); cursor: pointer;" ${this.state.stripSettings.lightLeaks ? 'checked' : ''} />
              </div>

              <div class="toggle-group" style="margin-top: 12px;">
                <span class="form-label">Add Dust & Scratches</span>
                <input type="checkbox" id="dustScratchesToggle" style="transform: scale(1.15); cursor: pointer;" ${this.state.stripSettings.dustAndScratches ? 'checked' : ''} />
              </div>
            </div>

            <!-- Section 4: Hand-drawn Signature -->
            <div class="panel-section">
              <h3 class="panel-title">4. Hand-drawn Signature</h3>
              <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span class="form-label">Draw/doodle in the ink pad:</span>
                <button id="clearSignatureBtn" class="control-btn" style="padding: 2px 8px; font-size: 0.75rem;">Clear Pad</button>
              </div>
              <canvas id="signaturePad" class="signature-pad-canvas" width="260" height="90"></canvas>
            </div>

            <!-- Final Print Actions -->
            <div class="panel-actions">
              <button id="generateStripBtn" class="btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print Photostrip
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Developing Loading Panel Overlay -->
      <div class="view-panel" id="developingOverlay" style="display: none;">
        <div class="developing-overlay">
          <!-- Flashing safe-red light -->
          <div class="safelight-bulb"></div>
          
          <!-- Wet chemical bath tray -->
          <div class="darkroom-tray">
            <div class="developing-paper">
              <div class="developing-paper-frame"></div>
              <div class="developing-paper-frame" style="animation-delay: 0.6s;"></div>
              <div class="developing-paper-frame" style="animation-delay: 1.2s;"></div>
              <div class="developing-paper-footer"></div>
            </div>
          </div>
          
          <h2 class="dev-title" id="loaderTitle">Developer Bath</h2>
          <p class="dev-desc" id="loaderDesc">Silver grains emerging under safety lights...</p>
        </div>
      </div>
    `;

    // Elements
    const workspace = container.querySelector('#customizeWorkspace') as HTMLElement;
    const developingOverlay = container.querySelector('#developingOverlay') as HTMLElement;
    const loaderTitle = container.querySelector('#loaderTitle') as HTMLElement;
    const loaderDesc = container.querySelector('#loaderDesc') as HTMLElement;

    const stripPreviewPaper = container.querySelector('#stripPreviewPaper') as HTMLElement;
    const previewCaption = container.querySelector('#previewCaption') as HTMLElement;
    const previewLocation = container.querySelector('#previewLocation') as HTMLElement;
    const previewDate = container.querySelector('#previewDate') as HTMLElement;
    const previewImages = container.querySelectorAll('.preview-img');

    const themeOptions = container.querySelectorAll('.theme-option');
    const styleOptions = container.querySelectorAll('.style-option');
    const captionInput = container.querySelector('#captionInput') as HTMLInputElement;
    const locationInput = container.querySelector('#locationInput') as HTMLInputElement;
    
    const showDateToggle = container.querySelector('#showDateToggle') as HTMLInputElement;
    const dateInputGroup = container.querySelector('#dateInputGroup') as HTMLElement;
    const dateInput = container.querySelector('#dateInput') as HTMLInputElement;
    
    const lightLeaksToggle = container.querySelector('#lightLeaksToggle') as HTMLInputElement;
    const dustScratchesToggle = container.querySelector('#dustScratchesToggle') as HTMLInputElement;
    
    const signaturePad = container.querySelector('#signaturePad') as HTMLCanvasElement;
    const clearSignatureBtn = container.querySelector('#clearSignatureBtn');
    
    const generateStripBtn = container.querySelector('#generateStripBtn');

    // 1. Theme selection event
    themeOptions.forEach((option) => {
      option.addEventListener('click', () => {
        const themeId = option.getAttribute('data-theme-id') || 'bw';
        this.audio.playTypewriter();

        themeOptions.forEach((opt) => opt.classList.remove('active'));
        option.classList.add('active');

        this.state.stripSettings.themeId = themeId;

        previewImages.forEach((img) => {
          ThemeManager.applyThemeToElement(img as HTMLElement, themeId);
        });
      });
    });

    // 2. Style selection event
    styleOptions.forEach((option) => {
      option.addEventListener('click', () => {
        const style = option.getAttribute('data-style') || 'classic';
        this.audio.playTypewriter();

        styleOptions.forEach((opt) => opt.classList.remove('active'));
        option.classList.add('active');

        this.state.stripSettings.borderStyle = style as any;
        stripPreviewPaper.className = `photostrip-paper strip-border-${style}`;
      });
    });

    // 3. Text inputs
    const handleTextInput = (
      inputEl: HTMLInputElement,
      previewEl: HTMLElement,
      prefix: string = ''
    ) => {
      inputEl.addEventListener('input', () => {
        this.audio.playTypewriter();
        const value = inputEl.value;
        previewEl.innerText = value ? prefix + value : '';

        if (inputEl.id === 'captionInput') {
          this.state.stripSettings.caption = value;
        } else if (inputEl.id === 'locationInput') {
          this.state.stripSettings.location = value;
        } else if (inputEl.id === 'dateInput') {
          this.state.stripSettings.dateStr = value;
          previewEl.innerText = value;
        }
      });
    };

    handleTextInput(captionInput, previewCaption);
    handleTextInput(locationInput, previewLocation, '📍 ');
    handleTextInput(dateInput, previewDate);

    // 4. Show Date Stamp toggle
    showDateToggle.addEventListener('change', () => {
      this.audio.playTypewriter();
      const checked = showDateToggle.checked;
      this.state.stripSettings.showDate = checked;
      
      previewDate.style.display = checked ? 'inline' : 'none';
      dateInputGroup.style.display = checked ? 'flex' : 'none';
    });

    // 5. Light Leaks toggle
    lightLeaksToggle.addEventListener('change', () => {
      this.audio.playTypewriter();
      const checked = lightLeaksToggle.checked;
      this.state.stripSettings.lightLeaks = checked;
      
      const leakOverlays = container.querySelectorAll('.light-leak-overlay');
      leakOverlays.forEach((overlay) => {
        (overlay as HTMLElement).style.display = checked ? 'block' : 'none';
      });
    });

    // 6. Dust & Scratches toggle
    dustScratchesToggle.addEventListener('change', () => {
      this.audio.playTypewriter();
      const checked = dustScratchesToggle.checked;
      this.state.stripSettings.dustAndScratches = checked;
      
      const scratchOverlays = container.querySelectorAll('.scratches-overlay');
      scratchOverlays.forEach((overlay) => {
        (overlay as HTMLElement).style.display = checked ? 'block' : 'none';
      });
    });

    // 7. Signature Pad drawing canvas (with mouse & touch coordinate checks)
    if (signaturePad) {
      const sigCtx = signaturePad.getContext('2d');
      if (sigCtx) {
        sigCtx.strokeStyle = '#2a2522'; // dark ink
        sigCtx.lineWidth = 2.5;
        sigCtx.lineCap = 'round';
        sigCtx.lineJoin = 'round';
        
        let drawing = false;
        let lastX = 0;
        let lastY = 0;

        const getCoordinates = (e: MouseEvent | TouchEvent) => {
          const rect = signaturePad.getBoundingClientRect();
          const scaleX = signaturePad.width / rect.width;
          const scaleY = signaturePad.height / rect.height;

          if ('touches' in e) {
            if (e.touches.length === 0) return { x: 0, y: 0 };
            return {
              x: (e.touches[0].clientX - rect.left) * scaleX,
              y: (e.touches[0].clientY - rect.top) * scaleY
            };
          } else {
            return {
              x: (e.clientX - rect.left) * scaleX,
              y: (e.clientY - rect.top) * scaleY
            };
          }
        };

        const startDrawing = (e: MouseEvent | TouchEvent) => {
          e.preventDefault();
          drawing = true;
          const coords = getCoordinates(e);
          lastX = coords.x;
          lastY = coords.y;
        };

        const draw = (e: MouseEvent | TouchEvent) => {
          if (!drawing) return;
          e.preventDefault();
          const coords = getCoordinates(e);
          
          sigCtx.beginPath();
          sigCtx.moveTo(lastX, lastY);
          sigCtx.lineTo(coords.x, coords.y);
          sigCtx.stroke();
          
          lastX = coords.x;
          lastY = coords.y;
        };

        const stopDrawing = () => {
          if (drawing) {
            drawing = false;
            this.audio.playTypewriter();
          }
        };

        signaturePad.addEventListener('mousedown', startDrawing);
        signaturePad.addEventListener('mousemove', draw);
        signaturePad.addEventListener('mouseup', stopDrawing);
        signaturePad.addEventListener('mouseleave', stopDrawing);

        signaturePad.addEventListener('touchstart', startDrawing, { passive: false });
        signaturePad.addEventListener('touchmove', draw, { passive: false });
        signaturePad.addEventListener('touchend', stopDrawing);
      }
    }

    clearSignatureBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      if (signaturePad) {
        const sigCtx = signaturePad.getContext('2d');
        sigCtx?.clearRect(0, 0, signaturePad.width, signaturePad.height);
        this.state.stripSettings.signatureDataUrl = '';
      }
    });

    // 8. Generate Strip button click
    generateStripBtn?.addEventListener('click', async () => {
      this.audio.playTypewriter();
      
      // Save signature to settings if drawn
      if (signaturePad) {
        const sigCtx = signaturePad.getContext('2d');
        const isBlank = !sigCtx
          ?.getImageData(0, 0, signaturePad.width, signaturePad.height)
          .data.some(channel => channel !== 0);
          
        if (!isBlank) {
          this.state.stripSettings.signatureDataUrl = signaturePad.toDataURL();
        } else {
          this.state.stripSettings.signatureDataUrl = '';
        }
      }

      workspace.style.display = 'none';
      developingOverlay.style.display = 'flex';

      const stages = [
        { title: 'Developer Bath', desc: 'Silver grains emerging in active developer...' },
        { title: 'Stop Bath', desc: 'Halting chemical development and locking exposure...' },
        { title: 'Fixer Bath', desc: 'Clearing silver halides for permanent contrast...' },
        { title: 'Final Rinse', desc: 'Washing chemicals and drying cardboard backing...' }
      ];

      for (let i = 0; i < stages.length; i++) {
        loaderTitle.innerText = stages[i].title;
        loaderDesc.innerText = stages[i].desc;
        this.audio.playTick();
        await this.wait(600);
      }

      try {
        const finalUrl = await StripGenerator.generateStrip(
          this.state.capturedFrames,
          this.state.stripSettings
        );
        this.state.finalStripUrl = finalUrl;
        this.onViewChange('result');
      } catch (err) {
        console.error('Failed to compose strip:', err);
        alert('Canvas generation failed. Returning to workspace.');
        workspace.style.display = 'flex';
        developingOverlay.style.display = 'none';
      }
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
