import './style.css';
import { inject } from '@vercel/analytics';
import type { AppState, AppView } from './types';
import { AudioManager } from './components/AudioManager';
import { CameraManager } from './components/CameraManager';
import { LandingView } from './views/LandingView';
import { CameraSetupView } from './views/CameraSetupView';
import { CaptureView } from './views/CaptureView';
import { CustomizeView } from './views/CustomizeView';
import { ResultView } from './views/ResultView';
import { fetchMomentsCount, subscribeToMomentsChanges } from './components/SupabaseClient';

// Initialize Vercel Analytics
inject();


class AppController {
  private container: HTMLElement;
  private headerContainer: HTMLElement;
  private viewContainer: HTMLElement;
  private footerContainer: HTMLElement;

  private state: AppState;
  private audio: AudioManager;
  private camera: CameraManager;
  private currentViewInstance: AppView | null = null;
  private unsubscribeRealtime: (() => void) | null = null;

  constructor() {
    this.container = document.querySelector<HTMLDivElement>('#app')!;

    // Set up sub-layout areas
    this.container.innerHTML = `
      <header class="app-header" id="appHeader"></header>
      <div id="viewWrapper" style="flex: 1; display: flex; width: 100%;"></div>
      <footer class="app-footer" id="appFooter"></footer>
    `;

    this.headerContainer = this.container.querySelector('#appHeader')!;
    this.viewContainer = this.container.querySelector('#viewWrapper')!;
    this.footerContainer = this.container.querySelector('#appFooter')!;

    // Initial State Setup
    this.state = {
      currentView: 'landing',
      capturedFrames: [],
      stripSettings: {
        themeId: 'bw',
        caption: '',
        location: '',
        showDate: true,
        dateStr: '',
        borderStyle: 'classic',
        lightLeaks: false,
        dustAndScratches: false,
        signatureDataUrl: '',
      },
      finalStripUrl: '',
      boothMode: 'strip',
    };

    this.audio = new AudioManager();
    this.camera = new CameraManager();

    // Render Shared Shell items
    this.renderHeader();
    this.renderFooter();

    // Route to initial view
    this.navigateTo(this.state.currentView);
  }

  // Trigger screen-drape curtain transition before resolving views
  private triggerCurtainTransition(onMidpoint: () => void) {
    const curtainOverlay = document.querySelector('#curtainOverlay');
    if (!curtainOverlay) {
      onMidpoint();
      return;
    }

    curtainOverlay.classList.add('closed');

    // Wait for the slide close duration (800ms) to update DOM, then open again
    setTimeout(() => {
      onMidpoint();
      setTimeout(() => {
        curtainOverlay.classList.remove('closed');
      }, 150);
    }, 800);
  }

  // Handle transitions between views gracefully
  public navigateTo(view: AppState['currentView']) {
    this.triggerCurtainTransition(() => {
      // 1. Destroy old view if cleanup is needed
      if (this.currentViewInstance && this.currentViewInstance.destroy) {
        this.currentViewInstance.destroy();
      }

      this.state.currentView = view;
      this.viewContainer.innerHTML = ''; // Clear container

      // 2. Instantiate and render target view
      switch (view) {
        case 'landing':
          this.currentViewInstance = new LandingView(
            this.state,
            this.audio,
            (nextView) => this.navigateTo(nextView)
          );
          break;

        case 'camera-setup':
          this.currentViewInstance = new CameraSetupView(
            this.state,
            this.audio,
            this.camera,
            (nextView) => {
              if (nextView === 'landing') this.navigateTo('landing');
              else if (nextView === 'capture') this.navigateTo('capture');
              else if (nextView === 'customize') this.navigateTo('customize');
            }
          );
          break;

        case 'capture':
          this.currentViewInstance = new CaptureView(
            this.state,
            this.audio,
            this.camera,
            (nextView) => {
              if (nextView === 'customize') this.navigateTo('customize');
              else if (nextView === 'landing') this.navigateTo('landing');
            }
          );
          break;

        case 'customize':
          this.currentViewInstance = new CustomizeView(
            this.state,
            this.audio,
            (nextView) => {
              if (nextView === 'result') this.navigateTo('result');
              else if (nextView === 'landing') this.navigateTo('landing');
            }
          );
          break;

        case 'result':
          this.currentViewInstance = new ResultView(
            this.state,
            this.audio,
            () => {
              this.resetSession();
              this.navigateTo('landing');
            }
          );
          break;
      }

      if (this.currentViewInstance) {
        this.currentViewInstance.render(this.viewContainer);
      }
    });
  }

  // Header render containing the moments counter
  private renderHeader() {
    this.headerContainer.innerHTML = `
      <div class="header-counter">
        <span class="counter-label">RETROLENS MOMENTS</span>
        <div class="counter-display" id="momentsCounterDisplay">
          <span class="counter-digits" id="momentsCounterDigits">------</span>
        </div>
      </div>
    `;

    // Fetch initial count
    fetchMomentsCount().then(count => {
      this.updateCounterUI(count);
    });

    // Subscribe to realtime updates
    if (this.unsubscribeRealtime) {
      this.unsubscribeRealtime();
    }
    this.unsubscribeRealtime = subscribeToMomentsChanges((newCount) => {
      this.updateCounterUI(newCount, true);
    });
  }

  private updateCounterUI(count: number, triggerFlash = false) {
    const digitsEl = this.headerContainer.querySelector('#momentsCounterDigits');
    const displayEl = this.headerContainer.querySelector('#momentsCounterDisplay') as HTMLElement | null;
    if (digitsEl) {
      digitsEl.textContent = count.toLocaleString();
    }
    if (triggerFlash && displayEl) {
      displayEl.classList.remove('flash-update');
      // trigger reflow
      void displayEl.offsetWidth;
      displayEl.classList.add('flash-update');

      if (!this.audio.isMuted()) {
        this.audio.playBeep();
      }
    }
  }

  // Footer template
  private renderFooter() {
    this.footerContainer.innerHTML = `
      <p style="margin: 0;">Made with ❤️ by Ethan</p>
    `;
  }

  // Reset captured state to start a clean new session
  private resetSession() {
    this.state.capturedFrames = [];
    this.state.finalStripUrl = '';
    this.state.stripSettings = {
      themeId: 'bw',
      caption: '',
      location: '',
      showDate: true,
      dateStr: '',
      borderStyle: 'classic',
      lightLeaks: false,
      dustAndScratches: false,
      signatureDataUrl: '',
    };
    this.state.boothMode = 'strip';
  }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
  new AppController();
});
