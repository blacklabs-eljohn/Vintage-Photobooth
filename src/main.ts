import './style.css';
import type { AppState, AppView } from './types';
import { AudioManager } from './components/AudioManager';
import { CameraManager } from './components/CameraManager';
import { LandingView } from './views/LandingView';
import { CameraSetupView } from './views/CameraSetupView';
import { CaptureView } from './views/CaptureView';
import { CustomizeView } from './views/CustomizeView';
import { ResultView } from './views/ResultView';

class AppController {
  private container: HTMLElement;
  private headerContainer: HTMLElement;
  private viewContainer: HTMLElement;
  private footerContainer: HTMLElement;

  private state: AppState;
  private audio: AudioManager;
  private camera: CameraManager;
  private currentViewInstance: AppView | null = null;

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

  // Header render containing the mute switch
  private renderHeader() {
    this.headerContainer.innerHTML = `
      <div class="logo-container">
        <h1 class="logo-title">RetroLens</h1>
        <p class="logo-sub">vintage photobooth</p>
      </div>
      <button class="control-btn" id="muteToggleBtn">
        <svg id="muteIcon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        <span id="muteLabel">Sound On</span>
      </button>
    `;

    const muteBtn = this.headerContainer.querySelector('#muteToggleBtn');
    const muteIcon = this.headerContainer.querySelector('#muteIcon');
    const muteLabel = this.headerContainer.querySelector('#muteLabel') as HTMLElement;

    muteBtn?.addEventListener('click', () => {
      const isMuted = this.audio.toggleMute();
      this.audio.playTypewriter(); // Will click if just unmuted

      if (isMuted) {
        muteLabel.innerText = 'Sound Muted';
        muteIcon!.innerHTML = `
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <line x1="23" y1="9" x2="17" y2="15"/>
          <line x1="17" y1="9" x2="23" y2="15"/>
        `;
      } else {
        muteLabel.innerText = 'Sound On';
        muteIcon!.innerHTML = `
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
        `;
      }
    });
  }

  // Footer template
  private renderFooter() {
    this.footerContainer.innerHTML = `
      <p style="margin: 0;">Made with ❤️ by Ethan • Client-Side Processing • Privacy First</p>
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
  }
}

// Instantiate on load
window.addEventListener('DOMContentLoaded', () => {
  new AppController();
});
