import type { StripSettings } from './components/StripGenerator';

export type AppViewType = 'landing' | 'camera-setup' | 'capture' | 'customize' | 'result' | 'duet';

export interface AppState {
  currentView: AppViewType;
  capturedFrames: string[]; // array of base64 data URLs
  stripSettings: StripSettings;
  finalStripUrl: string; // output generated image url
  boothMode: 'strip' | 'polaroid' | 'duet';
  duetRoomId?: string;
  duetRole?: 'host' | 'partner';
  humEnabled?: boolean;
  soundEnabled?: boolean;
  crtEnabled?: boolean;
}

export interface AppView {
  render(container: HTMLElement): void;
  destroy?(): void;
}
