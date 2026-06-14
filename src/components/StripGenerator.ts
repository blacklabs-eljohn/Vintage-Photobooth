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
    boothMode: 'strip' | 'polaroid' = 'strip'
  ): Promise<string> {
    const theme = ThemeManager.getTheme(settings.themeId);
    const numPhotos = imageUrls.length;
    const isPolaroid = boothMode === 'polaroid';

    // Dimensions for high-res output
    const canvasWidth = isPolaroid ? 700 : 800;
    const margin = isPolaroid ? 45 : 50;
    const photoWidth = canvasWidth - margin * 2;
    const photoHeight = isPolaroid ? photoWidth : Math.round(photoWidth * (3 / 4)); // Square 1:1 vs 4:3 aspect ratio
    const gap = isPolaroid ? 0 : 40;
    const footerHeight = isPolaroid ? 170 : 220; // Extra room at the bottom for typography/signatures

    // Calculate total canvas height
    const canvasHeight = isPolaroid
      ? margin + photoHeight + footerHeight // e.g., 45 + 610 + 170 = 825px
      : margin + numPhotos * photoHeight + (numPhotos - 1) * gap + footerHeight;

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
      imageUrls.map((url) => this.loadImage(url))
    );

    for (let i = 0; i < loadedImages.length; i++) {
      const img = loadedImages[i];
      const yPos = margin + i * (photoHeight + gap);

      // Save context state for potential transforms / clipping
      ctx.save();

      // Apply vintage filters directly onto canvas context
      ctx.filter = theme.canvasFilter;

      // Draw photo frame shadow (subtle stroke first)
      ctx.fillStyle = '#000000';
      ctx.fillRect(margin, yPos, photoWidth, photoHeight);

      // Draw photo
      // To fill the 4:3 frame without distortion, crop/scale if needed
      this.drawImageProp(ctx, img, margin, yPos, photoWidth, photoHeight, 0.5, 0.5);

      // Reset filter for overlays
      ctx.filter = 'none';

      // Draw light leak overlay on frame if enabled
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

      // Draw dust and scratches overlay on frame if enabled
      if (settings.dustAndScratches) {
        ctx.save();
        // 8 black/dark dust specs
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        for (let d = 0; d < 8; d++) {
          const dx = margin + Math.random() * photoWidth;
          const dy = yPos + Math.random() * photoHeight;
          const dsize = Math.random() * 2 + 1;
          ctx.fillRect(dx, dy, dsize, dsize);
        }
        // 4 white dust specs
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        for (let d = 0; d < 4; d++) {
          const dx = margin + Math.random() * photoWidth;
          const dy = yPos + Math.random() * photoHeight;
          const dsize = Math.random() * 1.5 + 1;
          ctx.fillRect(dx, dy, dsize, dsize);
        }
        // 2 dark vertical scratches
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        for (let s = 0; s < 2; s++) {
          const sx = margin + Math.random() * photoWidth;
          ctx.beginPath();
          ctx.moveTo(sx, yPos);
          ctx.lineTo(sx + (Math.random() * 4 - 2), yPos + photoHeight);
          ctx.stroke();
        }
        // 1 white vertical scratch
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        for (let s = 0; s < 1; s++) {
          const sx = margin + Math.random() * photoWidth;
          ctx.beginPath();
          ctx.moveTo(sx, yPos);
          ctx.lineTo(sx + (Math.random() * 2 - 1), yPos + photoHeight);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Draw subtle shadow inside the image frame to simulate depth
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 4;
      ctx.strokeRect(margin, yPos, photoWidth, photoHeight);

      // Draw subtle overlay color wash if defined
      if (theme.overlayColor && theme.overlayBlendMode) {
        ctx.save();
        ctx.globalCompositeOperation = theme.overlayBlendMode as GlobalCompositeOperation;
        ctx.fillStyle = theme.overlayColor;
        ctx.fillRect(margin, yPos, photoWidth, photoHeight);
        ctx.restore();
      }

      ctx.restore();
    }

    // 3. Draw Typography / Footer Area
    const footerYStart = canvasHeight - footerHeight;

    // Wait for fonts to ensure they render properly on canvas
    await document.fonts.ready;

    // Draw Caption
    if (settings.caption) {
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
    if (settings.location) {
      ctx.fillStyle = settings.borderStyle === 'charcoal' ? '#a5afbe' : '#7d7570';
      ctx.font = isPolaroid ? '22px "Special Elite", Courier, monospace' : '24px "Special Elite", Courier, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`📍 ${settings.location}`, margin + 15, isPolaroid ? canvasHeight - 65 : canvasHeight - 75);
    }

    // Draw Date Stamp (right bottom)
    if (settings.showDate && settings.dateStr) {
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
}
