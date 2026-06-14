export class AudioManager {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    // AudioContext will be initialized on first user interaction to comply with browser policies
  }

  private initContext() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  // Synthesize a quick mechanical click/tick for countdown
  public playTick() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn('Failed to play tick sound:', e);
    }
  }

  // Synthesize a vintage mechanical camera shutter clack
  public playShutter() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const duration = 0.25;
      
      // 1. Create a white noise buffer for the wind-down & shutter blades
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      // 2. Filter to make it sound mechanical and less raw
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      // 3. Shutter release click (fast sine wave burst)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.08);
      
      oscGain.gain.setValueAtTime(0.4, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      // 4. Main shutter gain envelope (clack sound)
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.2, ctx.currentTime);
      // Double click effect: click open, click close
      noiseGain.gain.setValueAtTime(0.25, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);
      noiseGain.gain.setValueAtTime(0.2, ctx.currentTime + 0.09);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      // Connections
      noiseNode.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);

      // Play
      noiseNode.start(ctx.currentTime);
      osc.start(ctx.currentTime);
      
      noiseNode.stop(ctx.currentTime + duration);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Failed to play shutter sound:', e);
    }
  }

  // Synthesize a mechanical typewriter clack for keyboard input
  public playTypewriter() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Mix typewriter clack frequencies
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.04);
    } catch (e) {
      console.warn('Failed to play typewriter sound:', e);
    }
  }

  // Synthesize a mechanical paper-feed whirr and clicks (duration 3.2s)
  public playDispenser() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const duration = 3.2; // matches the print-delivery height transition
      const now = ctx.currentTime;

      // 1. Motor Hum & Whirr
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.linearRampToValueAtTime(155, now + duration);

      // LFO to create vibrating whirr
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(45, now); // hum frequency
      lfoGain.gain.setValueAtTime(18, now); // vibrato depth

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, now);

      // Connect LFO to oscillator frequency
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      // Fade in and out
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.15); // fade in
      gainNode.gain.setValueAtTime(0.2, now + duration - 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // fade out

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      lfo.start(now);
      osc.stop(now + duration);
      lfo.stop(now + duration);

      // 2. Add periodic roller gear clicks
      const clickInterval = 0.14; // every 140ms
      const numClicks = Math.floor(duration / clickInterval) - 2;

      for (let i = 0; i < numClicks; i++) {
        const clickTime = now + (i * clickInterval) + 0.1;
        
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        
        clickOsc.type = 'sine';
        clickOsc.frequency.setValueAtTime(1100, clickTime);
        clickOsc.frequency.exponentialRampToValueAtTime(80, clickTime + 0.015);
        
        clickGain.gain.setValueAtTime(0.06, clickTime);
        clickGain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.015);
        
        clickOsc.connect(clickGain);
        clickGain.connect(ctx.destination);
        
        clickOsc.start(clickTime);
        clickOsc.stop(clickTime + 0.02);
      }
    } catch (e) {
      console.warn('Failed to play dispenser sound:', e);
    }
  }
}
