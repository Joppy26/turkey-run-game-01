// Gobble Run audio: every sound is synthesised with WebAudio. No audio files.
export const SOUND_NAMES = ['gobble', 'jump', 'pickup', 'hide', 'hit', 'spotted', 'caught', 'escape', 'click'];

/** Tiny synth: one AudioContext, one helper per sound shape. */
export class GobbleAudio {
  constructor() {
    this.context = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  /** Create the context on the first user gesture (browsers require it). */
  ensure() {
    if (!this.context) {
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        this.context = new Ctor();
      } catch (err) {
        this.context = null;
      }
    }
    if (this.context && this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  /** One short oscillator blip with a pitch slide. Silent until a user gesture creates the context. */
  blip(freqFrom, freqTo, seconds, type, gain) {
    if (this.muted || !this.context) return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freqFrom, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqTo), now + seconds);
    amp.gain.setValueAtTime(gain || 0.12, now);
    amp.gain.exponentialRampToValueAtTime(0.001, now + seconds);
    osc.connect(amp).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
  }

  /** A little noise burst (footsteps, thuds) from a generated buffer. */
  noise(seconds, gain, lowpass) {
    if (this.muted || !this.context) return;
    const ctx = this.context;
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 800;
    const amp = ctx.createGain();
    amp.gain.value = gain || 0.15;
    src.connect(filter).connect(amp).connect(ctx.destination);
    src.start();
  }

  gobble() {
    // The turkey's own voice: three fast falling "gob-gob-gob" notes.
    const notes = [420, 330, 260];
    notes.forEach((freq, i) => {
      window.setTimeout(() => this.blip(freq, freq * 0.6, 0.09, 'sawtooth', 0.07), i * 90);
    });
  }

  jump() { this.blip(300, 620, 0.16, 'sine', 0.1); }
  pickup() { this.blip(880, 1320, 0.12, 'triangle', 0.12); this.blip(1320, 1760, 0.1, 'triangle', 0.08); }
  hide() { this.blip(500, 180, 0.25, 'sine', 0.09); }
  hit() { this.noise(0.18, 0.25, 500); this.blip(160, 60, 0.25, 'square', 0.12); }
  spotted() { this.blip(700, 1100, 0.12, 'square', 0.08); this.blip(1100, 700, 0.12, 'square', 0.08); }
  caught() {
    [392, 370, 349, 311].forEach((freq, i) => {
      window.setTimeout(() => this.blip(freq, freq * 0.95, 0.3, 'triangle', 0.14), i * 170);
    });
  }
  escape() {
    [523, 659, 784, 1047].forEach((freq, i) => {
      window.setTimeout(() => this.blip(freq, freq, 0.28, 'triangle', 0.13), i * 130);
    });
  }
  click() { this.blip(600, 600, 0.05, 'square', 0.06); }

  play(name) {
    if (typeof this[name] === 'function') this[name]();
  }

  /** A cheerful plucky banjo-ish loop while running; stops itself on mute. */
  startMusic() {
    if (this.musicTimer) return;
    const tune = [392, 494, 587, 494, 440, 494, 587, 659, 587, 494, 440, 392];
    this.musicTimer = window.setInterval(() => {
      if (this.muted) return;
      const freq = tune[this.musicStep % tune.length];
      this.musicStep += 1;
      this.blip(freq, freq, 0.16, 'triangle', 0.045);
      if (this.musicStep % 4 === 1) this.blip(freq / 2, freq / 2, 0.2, 'sine', 0.05);
    }, 210);
  }

  stopMusic() {
    if (this.musicTimer) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
