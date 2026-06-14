export interface VintageTheme {
  id: string;
  name: string;
  cssClass: string;
  canvasFilter: string;
  dotColor: string;
  description: string;
  overlayBlendMode?: string;
  overlayColor?: string; // e.g. for tinting warm/sepia or light leaks
}

export const VINTAGE_THEMES: VintageTheme[] = [
  {
    id: 'bw',
    name: 'Classic B&W',
    cssClass: 'theme-bw',
    canvasFilter: 'grayscale(100%) contrast(1.2) brightness(1.02)',
    dotColor: '#555555',
    description: 'High contrast, deep grays, and vintage silver halide grain look.'
  },
  {
    id: 'warm',
    name: 'Warm Film',
    cssClass: 'theme-warm',
    canvasFilter: 'sepia(30%) contrast(1.08) saturate(1.15) brightness(0.98)',
    dotColor: '#a27b5c',
    description: 'Golden tones, creamy highlights, and cozy nostalgia.',
    overlayColor: 'rgba(162, 123, 92, 0.05)',
    overlayBlendMode: 'multiply'
  },
  {
    id: 'sepia',
    name: 'Aged Sepia',
    cssClass: 'theme-sepia',
    canvasFilter: 'sepia(100%) contrast(0.95) brightness(0.95)',
    dotColor: '#7b5a42',
    description: 'Beautifully faded amber wash that recalls early 1900s portraiture.'
  },
  {
    id: 'retro',
    name: 'Retro Color',
    cssClass: 'theme-retro',
    canvasFilter: 'hue-rotate(-10deg) saturate(1.3) contrast(1.1) brightness(1.02)',
    dotColor: '#c5a880',
    description: 'Rich, saturated warm colors inspired by vintage Polaroid films.',
    overlayColor: 'rgba(197, 168, 128, 0.04)',
    overlayBlendMode: 'color-burn'
  }
];

export class ThemeManager {
  public static getTheme(id: string): VintageTheme {
    return VINTAGE_THEMES.find(t => t.id === id) || VINTAGE_THEMES[0];
  }

  // Appends CSS filter classes directly onto an HTML image or video element
  public static applyThemeToElement(element: HTMLElement, themeId: string) {
    VINTAGE_THEMES.forEach(theme => {
      element.classList.remove(theme.cssClass);
    });
    const theme = this.getTheme(themeId);
    element.classList.add(theme.cssClass);
  }
}
