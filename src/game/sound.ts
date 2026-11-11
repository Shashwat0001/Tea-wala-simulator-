// Procedural Web Audio API Sound & Soulful Ambient Music Engine for Cozy Chai Tapri
// 100% zero external asset dependencies: warm Tanpura drone, Bansuri flute & Santoor melody, and tactile SFX

class TapriSoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private musicEnabled: boolean = true;
  private musicRunning: boolean = false;
  private userInteracted: boolean = false;
  private musicWanted: boolean = false;
  private musicIntervalId: number | null = null;
  private droneMasterGain: GainNode | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private melodyStep: number = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.userInteracted = true;
        if (this.musicWanted && this.musicEnabled && !this.muted && !this.musicRunning) {
          this.startBackgroundMusic();
        }
      };
      window.addEventListener('pointerdown', unlock, { once: true, passive: true });
      window.addEventListener('keydown', unlock, { once: true, passive: true });
    }
  }

  // Soulful Raag Pahadi / Yaman inspired peaceful pentatonic/heptatonic frequencies (Hz)
  // C4, D4, E4, G4, A4, B4, C5, D5, E5
  private readonly MELODY_PHRASES: number[][] = [
    [261.63, 293.66, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66],
    [329.63, 392.0, 440.0, 523.25, 587.33, 523.25, 440.0, 392.0],
    [392.0, 440.0, 392.0, 329.63, 293.66, 261.63, 293.66, 329.63],
    [523.25, 493.88, 440.0, 392.0, 329.63, 392.0, 440.0, 392.0],
  ];

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined' || !this.userInteracted) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
    if (mute) {
      this.stopBackgroundMusic();
    } else if (this.musicEnabled) {
      this.startBackgroundMusic();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopBackgroundMusic();
    } else if (!this.muted) {
      this.startBackgroundMusic();
    }
  }

  public isMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  // Starts the soulful, gentle background music (warm Tanpura drone + Bansuri flute & plucked strings)
  public startBackgroundMusic(): void {
    this.musicWanted = true;
    if (this.muted || !this.musicEnabled || this.musicRunning) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.musicRunning = true;
    const now = ctx.currentTime;

    // 1. Warm Continuous Tanpura Harmonic Drone (C3 = 130.81Hz, G3 = 196.00Hz, C4 = 261.63Hz)
    const droneMaster = ctx.createGain();
    droneMaster.gain.setValueAtTime(0.001, now);
    droneMaster.gain.linearRampToValueAtTime(0.032, now + 2.0);

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(340, now);

    droneFilter.connect(droneMaster);
    droneMaster.connect(ctx.destination);
    this.droneMasterGain = droneMaster;

    const droneFreqs = [130.81, 196.0, 261.63];
    this.droneOscillators = droneFreqs.map((freq, idx) => {
      const osc = ctx.createOscillator();
      const individualGain = ctx.createGain();
      osc.type = idx === 2 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      // Slow breathing LFO on each drone string
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(0.14 + idx * 0.05, now);
      lfoGain.gain.setValueAtTime(0.12, now);
      lfo.connect(lfoGain);
      lfoGain.connect(individualGain.gain);

      individualGain.gain.setValueAtTime(idx === 0 ? 0.45 : 0.28, now);
      osc.connect(individualGain);
      individualGain.connect(droneFilter);

      osc.start(now);
      lfo.start(now);
      return osc;
    });

    // 2. Schedule gentle Bansuri Flute & Santoor/Sitar melodic notes every 1.45 seconds
    this.playNextSoulfulNote();
    this.musicIntervalId = window.setInterval(() => {
      if (!this.musicRunning || this.muted || !this.musicEnabled) return;
      this.playNextSoulfulNote();
    }, 1450);
  }

  public stopBackgroundMusic(): void {
    this.musicRunning = false;
    if (this.musicIntervalId !== null) {
      clearInterval(this.musicIntervalId);
      this.musicIntervalId = null;
    }
    if (this.droneMasterGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.droneMasterGain.gain.setValueAtTime(this.droneMasterGain.gain.value, now);
        this.droneMasterGain.gain.linearRampToValueAtTime(0.0001, now + 0.4);
      } catch {
        // Ignore if context closed
      }
    }
    const oldOscs = this.droneOscillators;
    this.droneOscillators = [];
    setTimeout(() => {
      oldOscs.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // Ignore
        }
      });
    }, 450);
  }

  private playNextSoulfulNote(): void {
    if (this.muted || !this.musicEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const phraseIdx = Math.floor(this.melodyStep / 8) % this.MELODY_PHRASES.length;
    const noteIdx = this.melodyStep % 8;
    const freq = this.MELODY_PHRASES[phraseIdx][noteIdx];
    this.melodyStep++;

    const now = ctx.currentTime;

    // A. Expressive Bansuri Flute Voice (soft sine + gentle vibrato + breathy warm filter)
    const fluteOsc = ctx.createOscillator();
    const fluteGain = ctx.createGain();
    const fluteFilter = ctx.createBiquadFilter();

    fluteOsc.type = 'sine';
    // Gentle pitch glide into the note (meend)
    fluteOsc.frequency.setValueAtTime(freq * 0.985, now);
    fluteOsc.frequency.exponentialRampToValueAtTime(freq, now + 0.22);

    // Subtle 4.8 Hz vibrato on the Bansuri
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.setValueAtTime(4.8, now);
    vibratoGain.gain.setValueAtTime(2.2, now);
    vibrato.connect(vibratoGain);
    vibratoGain.connect(fluteOsc.frequency);

    fluteFilter.type = 'lowpass';
    fluteFilter.frequency.setValueAtTime(900, now);

    // Soft, unhurried swell and long peaceful decay
    fluteGain.gain.setValueAtTime(0.0001, now);
    fluteGain.gain.linearRampToValueAtTime(0.042, now + 0.38);
    fluteGain.gain.exponentialRampToValueAtTime(0.0008, now + 1.85);

    fluteOsc.connect(fluteFilter);
    fluteFilter.connect(fluteGain);
    fluteGain.connect(ctx.destination);

    fluteOsc.start(now);
    vibrato.start(now);
    fluteOsc.stop(now + 1.9);
    vibrato.stop(now + 1.9);

    // B. Every 2nd step, add a delicate Santoor / Sitar harmonic pluck an octave or fifth gently
    if (noteIdx % 2 === 0) {
      const pluckOsc = ctx.createOscillator();
      const pluckGain = ctx.createGain();
      pluckOsc.type = 'triangle';
      pluckOsc.frequency.setValueAtTime(freq * 1.5, now + 0.12);

      pluckGain.gain.setValueAtTime(0.0001, now + 0.12);
      pluckGain.gain.linearRampToValueAtTime(0.018, now + 0.16);
      pluckGain.gain.exponentialRampToValueAtTime(0.0005, now + 1.25);

      pluckOsc.connect(pluckGain);
      pluckGain.connect(ctx.destination);
      pluckOsc.start(now + 0.12);
      pluckOsc.stop(now + 1.3);
    }
  }

  // Tactile mortar & pestle pound (Khalbatta) — stone/brass thud + crisp spice crunch
  public playMortarCrush(crushStep: number = 1): void {
    if (this.muted) return;
    this.startBackgroundMusic();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const pitchVar = 0.94 + Math.random() * 0.12 + crushStep * 0.06;

    // 1. Resonant brass/stone mortar ring
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(175 * pitchVar, now);
    osc.frequency.exponentialRampToValueAtTime(68 * pitchVar, now + 0.14);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.17);

    // 2. High metallic brass chime harmonic
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(680 * pitchVar, now);
    bellGain.gain.setValueAtTime(0.09, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.start(now);
    bell.stop(now + 0.2);

    // 3. Crisp ginger/cardamom crunch burst
    const bufferSize = Math.floor(ctx.sampleRate * 0.08);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 * pitchVar, now);
    filter.Q.setValueAtTime(2.2, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    whiteNoise.start(now);
  }

  // Pouring water, milk, or brewed chai
  public playLiquidPour(): void {
    if (this.muted) return;
    this.startBackgroundMusic();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const freqs = [280, 340, 410, 480];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + idx * 0.065;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f * (0.96 + Math.random() * 0.08), t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.28, t + 0.06);

      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    });
  }

  // Dropping tea leaves or crushed spices into the simmering pot
  public playSpiceSizzle(): void {
    if (this.muted) return;
    this.startBackgroundMusic();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.22);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2200, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.18);
    oscGain.gain.setValueAtTime(0.1, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  // Chai finished boiling — cheerful bubbling & warm brass bell
  public playBubbleReady(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.08;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  // Placing side snack on tray
  public playSnackPlace(): void {
    if (this.muted) return;
    this.startBackgroundMusic();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.09);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // Serving customer & coins clinking into the Gullak jar
  public playServeCoins(): void {
    if (this.muted) return;
    this.startBackgroundMusic();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.075;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.37);
    });
  }

  private lofiTrackIndex: number = 0;
  private readonly LOFI_TRACK_NAMES: string[] = [
    'Raag Yaman Morning Lo-Fi',
    'Monsoon Chai Beats',
    'Evening Santoor Lounge',
  ];

  public getLoFiTrackName(): string {
    return this.LOFI_TRACK_NAMES[this.lofiTrackIndex % this.LOFI_TRACK_NAMES.length];
  }

  public cycleLoFiTrack(): string {
    this.lofiTrackIndex = (this.lofiTrackIndex + 1) % this.LOFI_TRACK_NAMES.length;
    this.melodyStep = this.lofiTrackIndex * 8;
    this.playRadioTune();
    return this.getLoFiTrackName();
  }

  // Sweet-spot Perfect Pour chime
  public playSweetSpotPerfect(): void {
    if (this.muted) return;
    this.startBackgroundMusic();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const chord = [587.33, 739.99, 880, 1174.66];
    chord.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.055;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.34);
    });
  }

  // Spill / Too Sweet error splash
  public playSpillError(): void {
    if (this.muted) return;
    this.startBackgroundMusic();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Descending splash tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.28);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, now);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);

    // Liquid splash noise
    const bufferSize = Math.floor(ctx.sampleRate * 0.2);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.14, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    noise.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);
  }

  // Wipe Cloth cleanup swish
  public playWipeClean(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.18);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.linearRampToValueAtTime(1600, now + 0.18);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  // Monsoon distant thunder rumble
  public playThunderRumble(): void {
    if (this.muted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const bufferSize = Math.floor(ctx.sampleRate * 0.9);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(165, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.88);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
  }

  // Vintage All India Radio tuning jingle
  public playRadioTune(): void {
    if (this.muted) return;
    this.startBackgroundMusic();
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const jingle = [440, 554.37, 659.25, 880];
    jingle.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = now + i * 0.11;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.26);
    });
  }
}

export const soundEngine = new TapriSoundEngine();
