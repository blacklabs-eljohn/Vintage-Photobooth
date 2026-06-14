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

  // Synthesize a metallic arcade coin drop sound (clink-clonk-chime)
  public playCoinDrop() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // 1. Initial metallic clinks (metal strike)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1500, now);
      osc1.frequency.exponentialRampToValueAtTime(800, now + 0.05);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.06);

      // Second clink (impact delay 60ms)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1200, now + 0.06);
      osc2.frequency.exponentialRampToValueAtTime(400, now + 0.12);
      gain2.gain.setValueAtTime(0.08, now + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.06);
      osc2.stop(now + 0.13);

      // 2. Coin sliding drop / clunk (delay 150ms)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(150, now + 0.15);
      osc3.frequency.exponentialRampToValueAtTime(80, now + 0.28);
      gain3.gain.setValueAtTime(0.25, now + 0.15);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.15);
      osc3.stop(now + 0.3);

      // 3. Metallic ring chime (coins rattling, delay 250ms)
      const osc4 = ctx.createOscillator();
      const gain4 = ctx.createGain();
      osc4.type = 'sine';
      osc4.frequency.setValueAtTime(1800, now + 0.25);
      osc4.frequency.exponentialRampToValueAtTime(1600, now + 0.45);
      gain4.gain.setValueAtTime(0.05, now + 0.25);
      gain4.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc4.connect(gain4);
      gain4.connect(ctx.destination);
      osc4.start(now + 0.25);
      osc4.stop(now + 0.5);
    } catch (e) {
      console.warn('Failed to play coin drop sound:', e);
    }
  }

  // Synthesize a mechanical paper tearing/ripping sound
  public playPaperTear() {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const duration = 0.35;
      const now = ctx.currentTime;

      // Noise buffer for the paper fiber rip
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate noise with low-frequency crackle elements
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        const crackle = Math.sin(i * 0.05) > 0.9 ? 1.5 : 1.0;
        data[i] = white * 0.3 * crackle;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      // Bandpass filter to isolate the paper ripping frequency band
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.frequency.linearRampToValueAtTime(700, now + duration);
      filter.Q.setValueAtTime(2.5, now);

      // Volume envelope with rapid gain fluctuations (ripping texture)
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05); // fast attack
      
      const modLFO = ctx.createOscillator();
      const modGain = ctx.createGain();
      modLFO.type = 'sawtooth';
      modLFO.frequency.setValueAtTime(35, now); // 35Hz vibration
      modGain.gain.setValueAtTime(0.12, now);
      
      modLFO.connect(modGain);
      modGain.connect(gainNode.gain);

      // Decay
      gainNode.gain.setValueAtTime(0.25, now + duration - 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Connections
      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      modLFO.start(now);
      noiseNode.start(now);

      modLFO.stop(now + duration);
      noiseNode.stop(now + duration);
    } catch (e) {
      console.warn('Failed to play paper tear sound:', e);
    }
  }
}
