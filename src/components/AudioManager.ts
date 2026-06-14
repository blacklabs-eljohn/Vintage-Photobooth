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

      // Helper to generate a short metallic impact (clink) with inharmonic frequencies
      const playImpact = (time: number, freq: number, duration: number, volume: number) => {
        const freqs = [freq, freq * 1.48, freq * 2.23, freq * 3.14];
        const oscs: OscillatorNode[] = [];
        const mixGain = ctx.createGain();
        mixGain.gain.setValueAtTime(0, time);
        mixGain.gain.linearRampToValueAtTime(volume, time + 0.002);
        mixGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        mixGain.connect(ctx.destination);

        freqs.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f + (idx * 3), time);
          osc.connect(mixGain);
          osc.start(time);
          osc.stop(time + duration + 0.05);
          oscs.push(osc);
        });
      };

      // Helper to play a short noise scraping sound (slither/drop)
      const playScrape = (time: number, duration: number, startFreq: number, endFreq: number, volume: number) => {
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = ctx.createBufferSource();
        noiseNode.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(startFreq, time);
        filter.frequency.exponentialRampToValueAtTime(endFreq, time + duration);
        filter.Q.setValueAtTime(3, time);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(volume, time + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);

        noiseNode.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        noiseNode.start(time);
        noiseNode.stop(time + duration + 0.05);
      };

      // Sequence of the coin's mechanical path:

      // 1. Initial slot insertion strike (Impact 1)
      playImpact(now, 1500, 0.08, 0.15);
      // High-pitch noise scrape representing coin edges brushing against slot
      playScrape(now, 0.06, 4000, 2000, 0.08);

      // 2. Sliding down the metal chute
      playScrape(now + 0.05, 0.22, 2200, 800, 0.04);

      // 3. Middle mechanical clicks (coin tumbling past slot gate balance arms)
      playImpact(now + 0.09, 1100, 0.04, 0.06);
      playImpact(now + 0.18, 950, 0.04, 0.05);

      // 4. Opto/trigger switch mechanical click
      const switchOsc = ctx.createOscillator();
      const switchGain = ctx.createGain();
      switchOsc.type = 'triangle';
      switchOsc.frequency.setValueAtTime(800, now + 0.22);
      switchOsc.frequency.setValueAtTime(400, now + 0.24);
      switchGain.gain.setValueAtTime(0.02, now + 0.22);
      switchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
      switchOsc.connect(switchGain);
      switchGain.connect(ctx.destination);
      switchOsc.start(now + 0.22);
      switchOsc.stop(now + 0.27);

      // 5. Final thud & bell ring inside the drawer (Impact 4)
      const thudTime = now + 0.28;

      // Dull low mechanical thump
      const thudOsc = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thudOsc.type = 'triangle';
      thudOsc.frequency.setValueAtTime(110, thudTime);
      thudOsc.frequency.exponentialRampToValueAtTime(45, thudTime + 0.15);
      thudGain.gain.setValueAtTime(0.2, thudTime);
      thudGain.gain.exponentialRampToValueAtTime(0.001, thudTime + 0.15);
      thudOsc.connect(thudGain);
      thudGain.connect(ctx.destination);
      thudOsc.start(thudTime);
      thudOsc.stop(thudTime + 0.2);

      // Final rattling metallic chimes/rings (different coin resonance)
      playImpact(thudTime, 1300, 0.25, 0.12);
      playImpact(thudTime + 0.04, 1850, 0.18, 0.07);

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
