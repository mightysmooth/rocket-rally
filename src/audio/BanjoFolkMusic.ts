// BanjoFolkMusic.ts - Procedural Outer Wilds-Inspired Campfire Folk Music Generator
// Synthesizes acoustic plucked banjo/guitar strings, campfire crackle, and wistful whistling

export class BanjoFolkMusic {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private isPlaying: boolean = false;
  private timerId: number | null = null;

  // Campfire ambient noise
  private fireGain: GainNode | null = null;
  private fireNoiseSource: AudioNode | null = null;
  private firePopsInterval: number | null = null;

  // Musical patterns (Frequencies in Hz)
  // Outer Wilds D Mixolydian / D Major chords & melodies
  private chords = [
    // D Major (D3, A3, D4, F#4)
    [146.83, 220.00, 293.66, 369.99],
    // G Major (G2, D3, G3, B3, D4)
    [98.00, 146.83, 196.00, 246.94, 293.66],
    // A Sus / A Major (A2, E3, A3, C#4)
    [110.00, 164.81, 220.00, 277.18],
    // B Minor (B2, F#3, D4, F#4)
    [123.47, 185.00, 293.66, 369.99]
  ];

  // Whistling melody notes (Outer Wilds main theme inspired)
  private melodyNotes = [
    293.66, // D4
    369.99, // F#4
    440.00, // A4
    587.33, // D5
    554.37, // C#5
    440.00, // A4
    369.99, // F#4
    329.63, // E4
    293.66  // D4
  ];

  private currentChordIdx: number = 0;
  private step: number = 0;
  private melodyStep: number = 0;

  constructor() {}

  public init(ctx: AudioContext, masterGain: GainNode): void {
    this.ctx = ctx;
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.musicGain.connect(masterGain);

    this.setupCampfireSound();
  }

  // Cozy campfire crackle & distant night crickets
  private setupCampfireSound(): void {
    if (!this.ctx || !this.musicGain) return;

    // Soft pink/brown background hiss (wind/fire bed)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.05;
      b1 = 0.96 * b1 + white * 0.11;
      b2 = 0.86 * b2 + white * 0.25;
      data[i] = (b0 + b1 + b2) * 0.15;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const fireFilter = this.ctx.createBiquadFilter();
    fireFilter.type = 'lowpass';
    fireFilter.frequency.setValueAtTime(700, this.ctx.currentTime);

    this.fireGain = this.ctx.createGain();
    this.fireGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    noiseSource.connect(fireFilter);
    fireFilter.connect(this.fireGain);
    this.fireGain.connect(this.musicGain);

    noiseSource.start();
    this.fireNoiseSource = noiseSource;
  }

  // Sporadic campfire wood pop/crackle
  private triggerFireCrackle(): void {
    if (!this.ctx || !this.musicGain || !this.isPlaying) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800 + Math.random() * 1400, now);

    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, now);

    gain.gain.setValueAtTime(0.06 + Math.random() * 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03 + Math.random() * 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  public start(): void {
    if (this.isPlaying || !this.ctx) return;
    this.isPlaying = true;

    // Start campfire crackles loop
    this.firePopsInterval = window.setInterval(() => {
      if (Math.random() > 0.4) {
        this.triggerFireCrackle();
      }
    }, 280);

    // Start arpeggio musical sequencer (~130 BPM quarter notes)
    const tickInterval = 230; // ms per 16th/8th note step
    this.timerId = window.setInterval(() => {
      this.tick();
    }, tickInterval);
  }

  public stop(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.firePopsInterval !== null) {
      clearInterval(this.firePopsInterval);
      this.firePopsInterval = null;
    }
  }

  // Musical sequencer tick
  private tick(): void {
    if (!this.ctx || !this.musicGain || !this.isPlaying) return;

    const chord = this.chords[this.currentChordIdx];

    // Banjo pluck pattern: fingerpicking alternating bass and high string
    let noteToPlay: number | null = null;
    let isBass = false;

    const patternStep = this.step % 8;
    if (patternStep === 0) {
      noteToPlay = chord[0]; // Bass root
      isBass = true;
    } else if (patternStep === 2) {
      noteToPlay = chord[chord.length - 1]; // High melody
    } else if (patternStep === 4) {
      noteToPlay = chord[1 % chord.length]; // Fifth / Mid
    } else if (patternStep === 6) {
      noteToPlay = chord[2 % chord.length]; // Third
    } else if (patternStep === 7 && Math.random() > 0.5) {
      noteToPlay = chord[chord.length - 1] * 1.5; // Little banjo flair
    }

    if (noteToPlay) {
      this.playPluckedString(noteToPlay, isBass ? 0.35 : 0.22, isBass ? 0.7 : 0.45);
    }

    // Occasional gentle traveler whistle every 16 steps
    if (this.step % 16 === 0 && Math.random() > 0.3) {
      const melodyFreq = this.melodyNotes[this.melodyStep % this.melodyNotes.length];
      this.playWhistleNote(melodyFreq);
      this.melodyStep++;
    }

    this.step++;
    if (this.step % 16 === 0) {
      this.currentChordIdx = (this.currentChordIdx + 1) % this.chords.length;
    }
  }

  // Plucked acoustic string synthesis (Karplus-Strong / filtered decaying saw)
  private playPluckedString(freq: number, volume: number, duration: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;

    // Dual oscillator for rich wooden body resonance
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    // Warm dampening filter simulating fingerpluck & wooden banjo head
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 4.5, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 1.2, now + duration * 0.7);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);

    osc.start(now);
    osc.stop(now + duration);
  }

  // Wistful Outer Wilds traveler whistling
  private playWhistleNote(freq: number): void {
    if (!this.ctx || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const duration = 1.4;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    // Gentle portamento glide into note
    osc.frequency.setValueAtTime(freq * 0.96, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.12);

    // Vibrato LFO
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(5.2, now); // 5.2 Hz gentle vibrato

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(freq * 0.015, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.15);
    gain.gain.setValueAtTime(0.18, now + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.musicGain);

    lfo.start(now);
    osc.start(now);
    lfo.stop(now + duration);
    osc.stop(now + duration);
  }
}

