import { ThemeManager } from './ThemeManager';

export interface StripSettings {
  themeId: string;
  caption: string;
  location: string;
  showDate: boolean;
  dateStr: string;
  borderStyle: 'classic' | 'warm' | 'charcoal' | 'cardboard' | 'disco';
  lightLeaks: boolean;
  dustAndScratches: boolean;
  signatureDataUrl: string;
}

export class StripGenerator {
  // Renders the high-quality vertical photo strip or polaroid to a Canvas and returns a Data URL
  public static async generateStrip(
    imageUrls: string[],
    settings: StripSettings,
    boothFormat: 'strip' | 'polaroid' | 'cinematic' | 'postcard' = 'strip'
  ): Promise<string> {
    let finalUrls = [...imageUrls];

    const theme = ThemeManager.getTheme(settings.themeId);
    const numPhotos = finalUrls.length;
    const isPolaroid = boothFormat === 'polaroid';
    const isCinematic = boothFormat === 'cinematic';
    const isPostcard = boothFormat === 'postcard';

    // Dimensions for high-res output
    let canvasWidth = 800;
    let canvasHeight = 600;
    let margin = 50;
    let photoWidth = 700;
    let photoHeight = 525;
    let gap = 40;
    let footerHeight = 220;

    if (isPolaroid) {
      canvasWidth = 700;
      margin = 45;
      photoWidth = canvasWidth - margin * 2;
      photoHeight = photoWidth;
      gap = 0;
      footerHeight = 170;
      canvasHeight = margin + photoHeight + footerHeight;
    } else if (isCinematic) {
      canvasWidth = 800;
      margin = 50;
      photoWidth = 700;
      photoHeight = 394; // 16:9
      gap = 0;
      footerHeight = 130;
      canvasHeight = 100 + photoHeight + footerHeight; // Extra room for sprockets
    } else if (isPostcard) {
      canvasWidth = 800;
      canvasHeight = 800;
      footerHeight = 150;
    } else {
      canvasWidth = 800;
      margin = 50;
      photoWidth = 700;
      photoHeight = 525;
      gap = 40;
      footerHeight = 220;
      canvasHeight = margin + numPhotos * photoHeight + (numPhotos - 1) * gap + footerHeight;
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context for strip generation');
    }

    // 1. Draw Paper Background Card
    let paperColor = '#ffffff';
    let textColor = '#22252a';
    let borderLineColor = '#dfd3c8';
    
    if (settings.borderStyle === 'warm') {
      paperColor = '#faf6f0';
      textColor = '#3c322a';
      borderLineColor = '#e5dbcc';
    } else if (settings.borderStyle === 'charcoal') {
      paperColor = '#262930';
      textColor = '#fbf9f6';
      borderLineColor = '#3e434f';
    } else if (settings.borderStyle === 'cardboard') {
      paperColor = '#c4a482';
      textColor = '#382410';
      borderLineColor = '#ab8c6a';
    } else if (settings.borderStyle === 'disco') {
      paperColor = '#fbfaf6';
      textColor = '#3a2c22';
      borderLineColor = '#3a2c22';
    }

    ctx.fillStyle = paperColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // If cardboard, render random fibers/dots
    if (settings.borderStyle === 'cardboard') {
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let i = 0; i < 400; i++) {
        const rx = Math.random() * canvasWidth;
        const ry = Math.random() * canvasHeight;
        const rsize = Math.random() * 2 + 1;
        ctx.fillRect(rx, ry, rsize, rsize);
      }
    }

    // Draw a subtle outer margin line to look like card borders
    ctx.strokeStyle = borderLineColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, canvasWidth - 20, canvasHeight - 20);

    // 2. Load and Draw Photos sequentially
    const loadedImages = await Promise.all(
      finalUrls.map((url) => this.loadImage(url))
    );

    if (isPostcard) {
      // Postcard 2x2 grid layout
      const gridCoords = [
        { x: 50, y: 50 },
        { x: 410, y: 50 },
        { x: 50, y: 345 },
        { x: 410, y: 345 }
      ];
      for (let i = 0; i < Math.min(loadedImages.length, 4); i++) {
        const img = loadedImages[i];
        const { x, y } = gridCoords[i];
        
        ctx.save();
        ctx.filter = theme.canvasFilter;
        ctx.fillStyle = '#000000';
        ctx.fillRect(x, y, 340, 255);
        this.drawImageProp(ctx, img, x, y, 340, 255, 0.5, 0.5);
        ctx.filter = 'none';
        
        if (settings.lightLeaks) {
          const leakGrad = ctx.createRadialGradient(x + 170, y + 127, 0, x + 170, y + 127, 250);
          leakGrad.addColorStop(0, 'rgba(255, 90, 0, 0.4)');
          leakGrad.addColorStop(0.3, 'rgba(255, 170, 0, 0.15)');
          leakGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = leakGrad;
          ctx.fillRect(x, y, 340, 255);
          ctx.restore();
        }
        
        if (settings.dustAndScratches) {
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          for (let d = 0; d < 4; d++) {
            ctx.fillRect(x + Math.random() * 340, y + Math.random() * 255, 2, 2);
          }
          ctx.restore();
        }
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, 340, 255);
        
        if (theme.overlayColor && theme.overlayBlendMode) {
          ctx.save();
          ctx.globalCompositeOperation = theme.overlayBlendMode as GlobalCompositeOperation;
          ctx.fillStyle = theme.overlayColor;
          ctx.fillRect(x, y, 340, 255);
          ctx.restore();
        }
        ctx.restore();
      }
    } else if (isCinematic) {
      // 16:9 widescreen cinematic
      const img = loadedImages[0];
      const yPos = 100; // room for top sprockets
      const phWidth = 700;
      const phHeight = 394;
      
      ctx.save();
      ctx.filter = theme.canvasFilter;
      ctx.fillStyle = '#000000';
      ctx.fillRect(50, yPos, phWidth, phHeight);
      this.drawImageProp(ctx, img, 50, yPos, phWidth, phHeight, 0.5, 0.5);
      ctx.filter = 'none';
      
      if (settings.lightLeaks) {
        const leakGrad = ctx.createRadialGradient(200, yPos + 200, 0, 200, yPos + 200, 400);
        leakGrad.addColorStop(0, 'rgba(255, 90, 0, 0.4)');
        leakGrad.addColorStop(0.3, 'rgba(255, 170, 0, 0.15)');
        leakGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = leakGrad;
        ctx.fillRect(50, yPos, phWidth, phHeight);
        ctx.restore();
      }
      
      if (settings.dustAndScratches) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let d = 0; d < 6; d++) {
          ctx.fillRect(50 + Math.random() * phWidth, yPos + Math.random() * phHeight, 2, 2);
        }
        ctx.restore();
      }
      
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 4;
      ctx.strokeRect(50, yPos, phWidth, phHeight);
      
      if (theme.overlayColor && theme.overlayBlendMode) {
        ctx.save();
        ctx.globalCompositeOperation = theme.overlayBlendMode as GlobalCompositeOperation;
        ctx.fillStyle = theme.overlayColor;
        ctx.fillRect(50, yPos, phWidth, phHeight);
        ctx.restore();
      }
      ctx.restore();
      
      // Draw Movie Subtitles overlay inside frame
      if (settings.caption) {
        ctx.save();
        ctx.fillStyle = '#ffea00';
        ctx.font = 'bold 24px "Outfit", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(`"${settings.caption}"`, canvasWidth / 2, yPos + phHeight - 35);
        ctx.restore();
      }

      // Draw black sprocket cells
      ctx.fillStyle = '#0f0f12';
      const holeWidth = 16;
      const holeHeight = 12;
      const holeSpacing = 28;
      const holeRadius = 2.5;
      for (let x = 30; x < canvasWidth - 30; x += holeSpacing) {
        this.drawRoundedRect(ctx, x, 18, holeWidth, holeHeight, holeRadius);
      }
      for (let x = 30; x < canvasWidth - 30; x += holeSpacing) {
        this.drawRoundedRect(ctx, x, canvasHeight - 30, holeWidth, holeHeight, holeRadius);
      }
    } else {
      // Classic vertical photo strip / polaroid cards
      for (let i = 0; i < loadedImages.length; i++) {
        const img = loadedImages[i];
        const yPos = margin + i * (photoHeight + gap);

        ctx.save();
        ctx.filter = theme.canvasFilter;
        ctx.fillStyle = '#000000';
        ctx.fillRect(margin, yPos, photoWidth, photoHeight);
        this.drawImageProp(ctx, img, margin, yPos, photoWidth, photoHeight, 0.5, 0.5);
        ctx.filter = 'none';

        if (settings.lightLeaks) {
          const leakGrad = ctx.createRadialGradient(
            margin + photoWidth * 0.1, yPos + photoHeight * 0.9, 0,
            margin + photoWidth * 0.1, yPos + photoHeight * 0.9, photoWidth * 0.75
          );
          leakGrad.addColorStop(0, 'rgba(255, 90, 0, 0.45)');
          leakGrad.addColorStop(0.3, 'rgba(255, 170, 0, 0.15)');
          leakGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = leakGrad;
          ctx.fillRect(margin, yPos, photoWidth, photoHeight);
          ctx.restore();
        }

        if (settings.dustAndScratches) {
          ctx.save();
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          for (let d = 0; d < 8; d++) {
            ctx.fillRect(margin + Math.random() * photoWidth, yPos + Math.random() * photoHeight, 2, 2);
          }
          ctx.restore();
        }

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 4;
        ctx.strokeRect(margin, yPos, photoWidth, photoHeight);

        if (theme.overlayColor && theme.overlayBlendMode) {
          ctx.save();
          ctx.globalCompositeOperation = theme.overlayBlendMode as GlobalCompositeOperation;
          ctx.fillStyle = theme.overlayColor;
          ctx.fillRect(margin, yPos, photoWidth, photoHeight);
          ctx.restore();
        }
        ctx.restore();
      }
    }

    // 3. Draw Typography / Footer Area
    const footerYStart = canvasHeight - footerHeight;

    // Wait for fonts to ensure they render properly on canvas
    await document.fonts.ready;

    // Draw Caption (only if not cinematic format)
    if (settings.caption && !isCinematic) {
      ctx.fillStyle = textColor;
      ctx.font = '36px "Special Elite", Courier, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Wrap caption text if it exceeds width
      const maxWidth = canvasWidth - margin * 3;
      const lines = this.wrapText(ctx, settings.caption, maxWidth);
      
      lines.forEach((line, index) => {
        const lineOffset = index * 45;
        ctx.fillText(line, canvasWidth / 2, footerYStart + 50 + lineOffset);
      });
    }

    // Draw Location (left bottom)
    if (settings.location && !isCinematic) {
      ctx.fillStyle = settings.borderStyle === 'charcoal' ? '#a5afbe' : '#7d7570';
      ctx.font = isPolaroid ? '22px "Special Elite", Courier, monospace' : '24px "Special Elite", Courier, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`📍 ${settings.location}`, margin + 15, isPolaroid ? canvasHeight - 65 : canvasHeight - 75);
    }

    // Draw Date Stamp (right bottom)
    if (settings.showDate && settings.dateStr && !isCinematic) {
      ctx.font = isPolaroid ? '24px "Share Tech Mono", monospace' : '28px "Share Tech Mono", monospace';
      // Classic orange camera LED stamp
      ctx.fillStyle = '#ff6b00';
      
      // Let's add a slight digital glow to the LED date stamp
      ctx.shadowColor = 'rgba(255, 107, 0, 0.5)';
      ctx.shadowBlur = 4;
      
      ctx.textAlign = 'right';
      ctx.fillText(settings.dateStr, canvasWidth - margin - 15, isPolaroid ? canvasHeight - 65 : canvasHeight - 75);
      
      // Reset shadows
      ctx.shadowBlur = 0;
    }

    // Draw Cinematic meta footer
    if (isCinematic) {
      ctx.fillStyle = settings.borderStyle === 'charcoal' ? '#a5afbe' : '#7d7570';
      ctx.font = '16px "Special Elite", Courier, monospace';
      ctx.textAlign = 'center';
      const metaParts = [
        settings.location ? `📍 ${settings.location}` : '',
        settings.showDate && settings.dateStr ? `📅 ${settings.dateStr}` : ''
      ].filter(Boolean).join('   |   ');
      ctx.fillText(metaParts, canvasWidth / 2, footerYStart + 50);
    }

    // Draw retro stripes at the bottom if disco style selected
    if (settings.borderStyle === 'disco') {
      const stripeColors = ['#7b5a42', '#d2b48c', '#e65c00', '#b22222'];
      const stripeHeight = isPolaroid ? 12 : 16;
      const yStripe = canvasHeight - stripeHeight - 15;
      const sliceWidth = canvasWidth / stripeColors.length;
      stripeColors.forEach((color, idx) => {
        ctx.fillStyle = color;
        ctx.fillRect(idx * sliceWidth, yStripe, sliceWidth, stripeHeight);
      });
    }

    // Draw Signature doodle if provided
    if (settings.signatureDataUrl) {
      try {
        const sigImg = await this.loadImage(settings.signatureDataUrl);
        ctx.save();
        const sigWidth = isPolaroid ? 180 : 200;
        const sigHeight = isPolaroid ? 60 : 70;
        const sigX = (canvasWidth - sigWidth) / 2;
        const sigY = isPolaroid ? canvasHeight - 100 : canvasHeight - 115;
        
        // Use multiply blend mode to overlay the black lines onto paper textures
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(sigImg, sigX, sigY, sigWidth, sigHeight);
        ctx.restore();
      } catch (err) {
        console.warn('Could not draw signature on canvas:', err);
      }
    }

    // Draw vintage logo stamp at the center bottom
    ctx.fillStyle = settings.borderStyle === 'charcoal' ? '#4f5564' : (settings.borderStyle === 'cardboard' ? '#5a4635' : '#cdc0b4');
    ctx.font = isPolaroid ? 'normal 400 14px "Outfit", sans-serif' : 'normal 400 16px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = isPolaroid ? '4px' : '6px';
    ctx.fillText('R E T R O L E N S', canvasWidth / 2, isPolaroid ? canvasHeight - 25 : canvasHeight - 35);
    ctx.letterSpacing = '0px'; // Reset letterSpacing

    return canvas.toDataURL('image/png');
  }

  // Promise helper to load images asynchronously
  private static loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Image failed to load: ' + src));
      img.src = src;
    });
  }

  // Draw image keeping ratio (aspect fill)
  private static drawImageProp(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    w: number,
    h: number,
    offsetX: number = 0.5,
    offsetY: number = 0.5
  ) {
    const iw = img.width;
    const ih = img.height;
    const r = Math.min(w / iw, h / ih);
    let nw = iw * r;
    let nh = ih * r;
    let cx = 0;
    let cy = 0;
    let cw = iw;
    let ch = ih;

    // Check if cropped
    if (nw < w) {
      const scale = w / nw;
      nw = w;
      nh = nh * scale;
    }
    if (nh < h) {
      const scale = h / nh;
      nh = h;
      nw = nw * scale;
    }

    // Calculate source rect
    cw = iw / (nw / w);
    ch = ih / (nh / h);

    cx = (iw - cw) * offsetX;
    cy = (ih - ch) * offsetY;

    // Clamp values
    if (cx < 0) cx = 0;
    if (cy < 0) cy = 0;
    if (cw > iw) cw = iw;
    if (ch > ih) ch = ih;

    ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
  }

  // Wrap text helper for drawing multi-line captions on canvas
  private static wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  }



  private static drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }
}
