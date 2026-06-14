import type { AppView, AppState } from '../types';
import { AudioManager } from '../components/AudioManager';

export class ResultView implements AppView {
  private state: AppState;
  private audio: AudioManager;
  private onRestart: () => void;

  private isTorn: boolean = false;
  private isDragging: boolean = false;
  private startY: number = 0;
  private currentPullHeight: number = 180; // matches initial slide-out halfway (180px)

  constructor(state: AppState, audio: AudioManager, onRestart: () => void) {
    this.state = state;
    this.audio = audio;
    this.onRestart = onRestart;
  }

  public render(container: HTMLElement) {
    const stripUrl = this.state.finalStripUrl;
    if (!stripUrl) {
      this.onRestart();
      return;
    }

    container.innerHTML = `
      <div class="view-panel">
        <div class="result-card">
          
          <!-- Printer mechanical slot header -->
          <div class="printer-slot-wrapper">
            <div class="printer-mouth"></div>
          </div>
          
          <!-- Paper delivery container -->
          <div class="print-delivery" id="printerDelivery">
            <img src="${stripUrl}" class="print-strip-result" id="resultStripImg" alt="Your Vintage Photostrip" />
          </div>

          <!-- Drag Tear Instruction Prompt -->
          <div class="pull-strip-label" id="tearPrompt">⬇️ Pull strip to tear off ⬇️</div>

          <!-- Actions (Starts locked until torn) -->
          <div class="result-actions locked" id="actionsPanel">
            <button id="downloadBtn" class="btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Download Photostrip
            </button>
            
            <div class="result-share-row">
              <button id="shareBtn" class="btn-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Share Strip
              </button>
              
              <button id="startOverBtn" class="btn-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 2v6h6M21.5 22v-6h-6"/><path d="M22 11.5A10 10 0 0 0 9.5 2.8L2.5 8M2 12.5a10 10 0 0 0 12.5 8.7l7-5.2"/></svg>
                Take New
              </button>
            </div>
          </div>
          
        </div>
      </div>
    `;

    const printerDelivery = container.querySelector('#printerDelivery') as HTMLElement;
    const tearPrompt = container.querySelector('#tearPrompt') as HTMLElement;
    const actionsPanel = container.querySelector('#actionsPanel') as HTMLElement;
    const downloadBtn = container.querySelector('#downloadBtn');
    const shareBtn = container.querySelector('#shareBtn');
    const startOverBtn = container.querySelector('#startOverBtn');

    // Trigger printing animation and dispenser audio whirr (half-slide)
    requestAnimationFrame(() => {
      printerDelivery?.classList.add('show');
      this.audio.playDispenser();
    });

    // Hook Pointer Drag Events for physical paper pulling
    const handleDragStart = (e: PointerEvent) => {
      if (this.isTorn) return;
      this.isDragging = true;
      this.startY = e.clientY;
      printerDelivery.classList.add('dragging');
      printerDelivery.classList.remove('springback');
      printerDelivery.setPointerCapture(e.pointerId);
    };

    const handleDragMove = (e: PointerEvent) => {
      if (!this.isDragging || this.isTorn) return;
      const diffY = e.clientY - this.startY;
      if (diffY > 0) {
        // User pulls downward: stretch height dynamically from 180px up to 320px
        this.currentPullHeight = Math.min(180 + diffY, 320);
        printerDelivery.style.height = `${this.currentPullHeight}px`;
      }
    };

    const handleDragEnd = (e: PointerEvent) => {
      if (!this.isDragging || this.isTorn) return;
      this.isDragging = false;
      printerDelivery.classList.remove('dragging');
      printerDelivery.releasePointerCapture(e.pointerId);

      const pullDistance = this.currentPullHeight - 180;
      if (pullDistance >= 70) {
        // Tear off!
        this.isTorn = true;
        
        // Play physical rip sound
        this.audio.playPaperTear();
        
        // Full stretch slide-down
        printerDelivery.style.height = ''; // Let class control it
        printerDelivery.classList.add('torn');
        
        // Hide tear prompt and unlock action buttons
        if (tearPrompt) tearPrompt.style.display = 'none';
        actionsPanel?.classList.remove('locked');
      } else {
        // Spring back to 180px
        printerDelivery.classList.add('springback');
        this.currentPullHeight = 180;
        printerDelivery.style.height = '180px';
        setTimeout(() => {
          printerDelivery.classList.remove('springback');
          printerDelivery.style.height = ''; // return control to CSS
        }, 300);
      }
    };

    printerDelivery.addEventListener('pointerdown', handleDragStart);
    printerDelivery.addEventListener('pointermove', handleDragMove);
    printerDelivery.addEventListener('pointerup', handleDragEnd);
    printerDelivery.addEventListener('pointercancel', handleDragEnd);

    // 1. Download Photostrip
    downloadBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      
      const link = document.createElement('a');
      link.download = `retrolens-${Date.now()}.png`;
      link.href = stripUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    // 2. Share
    shareBtn?.addEventListener('click', async () => {
      this.audio.playTypewriter();
      
      try {
        const res = await fetch(stripUrl);
        const blob = await res.blob();
        const file = new File([blob], 'retro-strip.png', { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'RetroLens Photostrip',
            text: 'Look at my vintage photostrip!'
          });
        } else {
          await navigator.share({
            title: 'RetroLens Photostrip',
            text: 'I generated this vintage photostrip at RetroLens! Check it out.',
            url: window.location.href
          });
        }
      } catch (err) {
        console.warn('Web Share failed or unsupported:', err);
        alert('Sharing is not supported on this browser. Please download the image to share!');
      }
    });

    // 3. Start Over
    startOverBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      this.onRestart();
    });
  }
}
