import type { AppView, AppState } from '../types';
import { AudioManager } from '../components/AudioManager';

export class ResultView implements AppView {
  private state: AppState;
  private audio: AudioManager;
  private onRestart: () => void;

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

          <!-- Actions -->
          <div class="result-actions">
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
    const downloadBtn = container.querySelector('#downloadBtn');
    const shareBtn = container.querySelector('#shareBtn');
    const startOverBtn = container.querySelector('#startOverBtn');

    // Trigger printing animation
    requestAnimationFrame(() => {
      printerDelivery?.classList.add('show');
      
      this.audio.playShutter();
      setTimeout(() => this.audio.playTypewriter(), 800);
      setTimeout(() => this.audio.playTypewriter(), 1600);
    });

    // 1. Download
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
