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

            <button id="downloadGifBtn" class="btn-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
              Download GIF Slideshow
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
    const downloadGifBtn = container.querySelector('#downloadGifBtn') as HTMLButtonElement;
    const shareBtn = container.querySelector('#shareBtn');
    const startOverBtn = container.querySelector('#startOverBtn');

    // Trigger printing animation and dispenser audio whirr
    requestAnimationFrame(() => {
      printerDelivery?.classList.add('show');
      this.audio.playDispenser();
    });

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

    // 2. Download GIF Slideshow
    downloadGifBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      if (this.state.gifUrl) {
        this.downloadGif();
      } else {
        this.compileGif(container);
      }
    });

    // 3. Share
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

    // 4. Start Over
    startOverBtn?.addEventListener('click', () => {
      this.audio.playTypewriter();
      this.onRestart();
    });
  }

  private async compileGif(container: HTMLElement) {
    const downloadGifBtn = container.querySelector('#downloadGifBtn') as HTMLButtonElement;
    if (!downloadGifBtn) return;

    downloadGifBtn.disabled = true;
    downloadGifBtn.innerHTML = `
      <svg class="chem-loader-inline" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin-loader 0.8s linear infinite; margin-right: 6px; display: inline-block; vertical-align: middle;"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
      Compiling GIF...
    `;

    try {
      // Load gifshot dynamically via esm.sh
      // @ts-ignore
      const gifshotModule = await import('https://esm.sh/gifshot@0.4.5');
      const gifshot = gifshotModule.default || gifshotModule;

      // Preprocess each frame to apply canvas-based filters
      const processedFrames = await Promise.all(
        this.state.capturedFrames.map((frameUrl) => this.preprocessFrameForGif(frameUrl))
      );

      gifshot.createGIF({
        images: processedFrames,
        gifWidth: 400,
        gifHeight: 300,
        interval: 0.5, // 500ms slide intervals
        numFrames: 3,
        frameDuration: 5,
        sampleInterval: 10
      }, (obj: any) => {
        if (obj.error) {
          console.error('Gifshot failed:', obj.error);
          alert('Failed to generate GIF. Please try again!');
          this.resetGifButton(downloadGifBtn);
        } else {
          this.state.gifUrl = obj.image;
          this.downloadGif();
          this.resetGifButton(downloadGifBtn, true);
        }
      });
    } catch (err) {
      console.error('Failed to compile GIF dynamically:', err);
      alert('GIF compiler is temporarily unavailable. Please try again later!');
      this.resetGifButton(downloadGifBtn);
    }
  }

  private resetGifButton(btn: HTMLButtonElement, success = false) {
    btn.disabled = false;
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      ${success ? 'GIF Downloaded' : 'Download GIF Slideshow'}
    `;
  }

  private downloadGif() {
    if (!this.state.gifUrl) return;
    const link = document.createElement('a');
    link.download = `retrolens-${Date.now()}.gif`;
    link.href = this.state.gifUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private preprocessFrameForGif(frameUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 300;
        const ctx = canvas.getContext('2d')!;

        // Apply filters
        const settings = this.state.stripSettings;
        ctx.filter = this.getCanvasFilterString(settings.themeId);
        ctx.drawImage(img, 0, 0, 400, 300);
        ctx.filter = 'none'; // reset filter for overlays

        // Draw light leak if enabled
        if (settings.lightLeaks) {
          const leakGrad = ctx.createRadialGradient(0, 300, 0, 0, 300, 200);
          leakGrad.addColorStop(0, 'rgba(255, 90, 0, 0.35)');
          leakGrad.addColorStop(0.4, 'rgba(255, 170, 0, 0.12)');
          leakGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = leakGrad;
          ctx.globalCompositeOperation = 'screen';
          ctx.fillRect(0, 0, 400, 300);
          ctx.globalCompositeOperation = 'source-over'; // reset
        }

        // Draw dust and scratches if enabled
        if (settings.dustAndScratches) {
          ctx.strokeStyle = 'rgba(255,255,255,0.12)';
          ctx.lineWidth = 0.55;
          ctx.beginPath();
          ctx.moveTo(Math.random() * 400, 0);
          ctx.lineTo(Math.random() * 400, 300);
          ctx.stroke();

          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          for (let d = 0; d < 8; d++) {
            ctx.fillRect(Math.random() * 400, Math.random() * 300, 1.5, 1.5);
          }
        }

        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = frameUrl;
    });
  }

  private getCanvasFilterString(themeId: string): string {
    switch (themeId) {
      case 'bw':
        return 'grayscale(1) contrast(1.2) brightness(1.02)';
      case 'warm':
        return 'sepia(0.3) contrast(1.08) saturate(1.15) brightness(0.98)';
      case 'sepia':
        return 'sepia(1) contrast(0.95) brightness(0.95)';
      case 'retro':
        return 'hue-rotate(-10deg) saturate(1.3) contrast(1.1) brightness(1.02)';
      default:
        return 'none';
    }
  }
}
