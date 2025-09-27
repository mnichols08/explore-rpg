function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export class AudioEngine {
  constructor() {
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.chargeSource = null;
    this.chargeKind = null;
    this.musicEnabled = false;
    this.musicTimer = null;
    this.musicSeed = Date.now() ^ 0x9151ba27;
    this.nextMusicTime = 0;
    this.musicStep = 0;
    this.rand = seededRandom(this.musicSeed);
  }

  ensureContext() {
    if (!window.AudioContext) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.masterGain = this.context.createGain();
      this.masterGain.gain.value = 0.8;
      this.masterGain.connect(this.context.destination);

      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = 0.0;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.context.createGain();
      this.sfxGain.gain.value = 0.9;
      this.sfxGain.connect(this.masterGain);

      this.nextMusicTime = this.context.currentTime + 0.1;
      this.musicStep = 0;
      this.rand = seededRandom(this.musicSeed);
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    if (this.musicEnabled) {
      this._startMusicLoop();
    }
  }

  toggleMusic() {
    this.setMusicEnabled(!this.musicEnabled);
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!this.context) return;
    if (enabled) {
      this.ensureContext();
      const now = this.context.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setTargetAtTime(0.35, now, 0.7);
      this._startMusicLoop();
    } else {
      const now = this.context.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setTargetAtTime(0.0001, now, 0.5);
      this._stopMusicLoop();
    }
  }

  onActionStart(kind) {
    if (!this.context) return;
    this.ensureContext();
    const baseFreq = { melee: 95, ranged: 210, spell: 320 }[kind] ?? 140;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = kind === 'spell' ? 'triangle' : kind === 'ranged' ? 'square' : 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq, this.context.currentTime);
    gain.gain.setValueAtTime(0.0001, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, this.context.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();

    if (this.chargeSource) {
      this._stopChargeOscillator(0.05);
    }

    this.chargeSource = { osc, gain, baseFreq };
    this.chargeKind = kind;
  }

  onChargeProgress(kind, ratio) {
    if (!this.chargeSource || this.chargeKind !== kind || !this.context) return;
    const now = this.context.currentTime;
    const pitchDelta = kind === 'spell' ? 520 : kind === 'ranged' ? 360 : 220;
    const targetFreq = this.chargeSource.baseFreq + pitchDelta * Math.min(1, Math.max(0, ratio));
    this.chargeSource.osc.frequency.cancelScheduledValues(now);
    this.chargeSource.osc.frequency.linearRampToValueAtTime(targetFreq, now + 0.05);

    const targetGain = 0.2 + ratio * 0.4;
    this.chargeSource.gain.gain.cancelScheduledValues(now);
    this.chargeSource.gain.gain.linearRampToValueAtTime(targetGain, now + 0.05);
  }

  onActionRelease(kind, ratio) {
    if (!this.context) return;
    const amount = Math.max(0.05, Math.min(1, ratio));
    if (this.chargeSource && this.chargeKind === kind) {
      this._stopChargeOscillator(0.08);
    }
    this._burst(kind, amount);
  }

  onActionCancel(kind) {
    if (!this.context) return;
    if (this.chargeSource && this.chargeKind === kind) {
      this._stopChargeOscillator(0.04);
    }
  }

  onEffect(effect, local = false) {
    if (!this.context) return;
    const intensity = local ? 1 : 0.6;
    const type = effect.type;
    if (type === 'melee') {
      this._thump(intensity);
    } else if (type === 'ranged') {
      this._snap(intensity);
    } else if (type === 'spell') {
      this._whoosh(intensity);
    }
  }

  _stopChargeOscillator(release = 0.1) {
    if (!this.chargeSource || !this.context) return;
    const { osc, gain } = this.chargeSource;
    const now = this.context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0.0001, now, release);
    osc.stop(now + release * 6);
    this.chargeSource = null;
    this.chargeKind = null;
  }

  _burst(kind, amount) {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind === 'spell' ? 'sine' : 'sawtooth';
    const base = { melee: 140, ranged: 270, spell: 420 }[kind] ?? 160;
    osc.frequency.setValueAtTime(base, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(base * (1 + amount * 0.8), ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2 * amount, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }

  _thump(amount) {
    const ctx = this.context;
    const bufferSize = 512;
    const noise = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      const envelope = 1 - i / bufferSize;
      data[i] = (Math.random() * 2 - 1) * envelope * amount * 0.8;
    }
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35 * amount, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    source.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
  }

  _snap(amount) {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(680, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.18 * amount, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  _whoosh(amount) {
    const ctx = this.context;
    const noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5);
    }
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500 + amount * 900, ctx.currentTime);
    filter.Q.value = 0.8 + amount * 1.4;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22 * amount, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
    source.stop(ctx.currentTime + 0.6);
  }

  _startMusicLoop() {
    if (this.musicTimer) return;
    if (!this.context) return;
    this.musicTimer = setInterval(() => this._tickMusic(), 150);
  }

  _stopMusicLoop() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  _tickMusic() {
    if (!this.context || !this.musicEnabled) return;
    const ctx = this.context;
    const tempo = 92;
    const beat = 60 / tempo;
    while (this.nextMusicTime < ctx.currentTime + 1.5) {
      const chordIndex = Math.floor((this.musicStep % 16) / 4);
      const baseMidi = [48, 53, 50, 55][chordIndex % 4];
      const scale = [0, 3, 5, 7, 10];
      const melodyStep = scale[Math.floor(this.rand() * scale.length)];
      this._playNote(baseMidi + melodyStep, beat * 0.9, 0.12 + this.rand() * 0.08);
      if (this.musicStep % 2 === 0) {
        this._playPercussion(this.musicStep, beat);
      }
      this.musicStep += 1;
      this.nextMusicTime += beat;
    }
  }

  _playNote(midi, duration, gainValue) {
    const ctx = this.context;
    const frequency = 440 * Math.pow(2, (midi - 69) / 12);
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const gain = ctx.createGain();
    const now = this.nextMusicTime;
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.frequency.setValueAtTime(frequency, now);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + duration * 1.2);
  }

  _playPercussion(step, beat) {
    const ctx = this.context;
    const startTime = this.nextMusicTime;
    const noise = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const gain = ctx.createGain();
    const strength = step % 4 === 0 ? 0.25 : 0.12;
    gain.gain.setValueAtTime(strength, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + beat * 0.6);
    source.connect(gain);
    gain.connect(this.musicGain);
    source.start(startTime);
    source.stop(startTime + beat * 0.6);
  }
}

