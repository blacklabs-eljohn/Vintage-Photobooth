import type { StripSettings } from './components/StripGenerator';

export type AppViewType = 'landing' | 'camera-setup' | 'capture' | 'customize' | 'result';

export interface AppState {
  currentView: AppViewType;
  capturedFrames: string[]; // array of base64 data URLs
  stripSettings: StripSettings;
  finalStripUrl: string; // output generated image url
  gifUrl?: string; // compiled animated GIF slideshow url
}

export interface AppView {
  render(container: HTMLElement): void;
  destroy?(): void;
}
