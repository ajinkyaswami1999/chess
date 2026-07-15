class SoundSynth {
  private ctx: AudioContext | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGainNode: GainNode | null = null;
  private ambientVolume: number = 0.3;
  private sfxVolume: number = 0.7;

  constructor() {
    // Lazily initialize AudioContext on first user interaction
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      this.sfxGainNode = this.ctx.createGain();
      this.sfxGainNode.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGainNode.connect(this.ctx.destination);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(0, this.ctx.currentTime); // start silent, fade in
      this.ambientGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolumes(sfxVol: number, ambientVol: number) {
    this.sfxVolume = sfxVol;
    this.ambientVolume = ambientVol;
    
    if (this.sfxGainNode && this.ctx) {
      this.sfxGainNode.gain.setTargetAtTime(sfxVol, this.ctx.currentTime, 0.05);
    }
    if (this.ambientGain && this.ctx) {
      // If ambient is playing, set it to the target volume, otherwise keep it at 0
      if (this.ambientSource) {
        this.ambientGain.gain.setTargetAtTime(ambientVol, this.ctx.currentTime, 0.5);
      }
    }
  }

  // Create wood block click sound
  private playWoodClick(timeOffset: number = 0, pitchMultiplier: number = 1.0) {
    if (!this.ctx || !this.sfxGainNode) return;
    const t = this.ctx.currentTime + timeOffset;

    // Body of the wood block (low frequency sine wave)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(240 * pitchMultiplier, t);
    osc1.frequency.exponentialRampToValueAtTime(110 * pitchMultiplier, t + 0.08);

    gain1.gain.setValueAtTime(1.0, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    // High frequency woody crack (triangle wave)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(600 * pitchMultiplier, t);
    osc2.frequency.exponentialRampToValueAtTime(180 * pitchMultiplier, t + 0.04);

    gain2.gain.setValueAtTime(0.4, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    // Connect nodes
    osc1.connect(gain1);
    gain1.connect(this.sfxGainNode);
    
    osc2.connect(gain2);
    gain2.connect(this.sfxGainNode);

    osc1.start(t);
    osc1.stop(t + 0.1);
    osc2.start(t);
    osc2.stop(t + 0.05);
  }

  // Generate white noise for capture snap
  private generateNoiseBuffer(): AudioBuffer {
    const size = this.ctx!.sampleRate * 0.15; // 0.15s of noise
    const buffer = this.ctx!.createBuffer(1, size, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public playMove() {
    this.initCtx();
    this.playWoodClick(0, 1.0);
  }

  public playCapture() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode) return;
    const t = this.ctx.currentTime;

    // Wood click body
    this.playWoodClick(0, 0.85);

    // Noise burst for impact crackle
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.generateNoiseBuffer();

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1200, t);
    noiseFilter.Q.setValueAtTime(2.0, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGainNode);

    noise.start(t);
    noise.stop(t + 0.15);
  }

  public playCheck() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode) return;
    const t = this.ctx.currentTime;

    // Tense dual oscillator chime (minor second dissonance)
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(493.88, t); // B4
    osc1.frequency.linearRampToValueAtTime(440.00, t + 0.35); // slide to A4

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, t); // C5 (dissonant with B4)
    osc2.frequency.linearRampToValueAtTime(466.16, t + 0.35); // slide to A#4

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGainNode);

    osc1.start(t);
    osc1.stop(t + 0.5);
    osc2.start(t);
    osc2.stop(t + 0.5);
  }

  public playCastle() {
    this.initCtx();
    // Two rapid wood clicks representing two pieces sliding
    this.playWoodClick(0, 0.95);
    this.playWoodClick(0.12, 1.05);
  }

  public playPromotion() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode) return;
    const t = this.ctx.currentTime;

    // Rising sweep oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.4);

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.6, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.sfxGainNode);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  public playStart() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode) return;
    const t = this.ctx.currentTime;

    // Warm major triad arpeggio
    const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + index * 0.08);

      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.3, t + index * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + index * 0.08 + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(t + index * 0.08);
      osc.stop(t + index * 0.08 + 0.5);
    });
  }

  public playVictory() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode) return;
    const t = this.ctx.currentTime;

    // Triumphant ascending arpeggio ending on C major chord
    const arpeggio = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C4, E4, G4, C5, E5, G5, C6
    
    arpeggio.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = idx === arpeggio.length - 1 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);

      const delay = idx * 0.07;
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(idx === arpeggio.length - 1 ? 0.4 : 0.25, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 0.8);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(t + delay);
      osc.stop(t + delay + 0.9);
    });
  }

  public playDefeat() {
    this.initCtx();
    if (!this.ctx || !this.sfxGainNode) return;
    const t = this.ctx.currentTime;

    // Somber descending minor chord arpeggio
    const arpeggio = [392.00, 311.13, 261.63, 196.00, 130.81]; // G4, Eb4, C4, G3, C3
    
    arpeggio.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.12);

      const delay = idx * 0.12;
      gain.gain.setValueAtTime(0, t);
      gain.gain.setValueAtTime(0.35, t + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, t + delay + 1.2);

      osc.connect(gain);
      gain.connect(this.sfxGainNode!);

      osc.start(t + delay);
      osc.stop(t + delay + 1.3);
    });
  }

  // Generate brownian noise buffer for room drone
  private generateBrownianBuffer(): AudioBuffer {
    const bufferSize = this.ctx!.sampleRate * 2.0; // 2 seconds loop
    const buffer = this.ctx!.createBuffer(1, bufferSize, this.ctx!.sampleRate);
    const data = buffer.getChannelData(0);
    
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brownian integration filter
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Compensate for loss of volume
    }
    return buffer;
  }

  public startAmbient() {
    this.initCtx();
    if (!this.ctx || !this.ambientGain || this.ambientSource) return;

    const t = this.ctx.currentTime;
    
    // Create looped Brownian noise source
    this.ambientSource = this.ctx.createBufferSource();
    this.ambientSource.buffer = this.generateBrownianBuffer();
    this.ambientSource.loop = true;

    // Warm lowpass filter to simulate an acoustic room background
    const lowpass = this.ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(160, t);

    // Dynamic modulation (slow ambient waves)
    const modulator = this.ctx.createOscillator();
    modulator.frequency.setValueAtTime(0.08, t); // 0.08Hz - very slow wave
    
    const modulatorGain = this.ctx.createGain();
    modulatorGain.gain.setValueAtTime(0.12, t); // modulate volume slightly

    // Connect modulator to lowpass frequency for extra room-tone realism
    modulator.connect(modulatorGain);
    modulatorGain.connect(lowpass.frequency);

    this.ambientSource.connect(lowpass);
    lowpass.connect(this.ambientGain);
    
    // Smoothly fade in ambient sound
    this.ambientGain.gain.setValueAtTime(0, t);
    this.ambientGain.gain.linearRampToValueAtTime(this.ambientVolume, t + 2.0);

    modulator.start(t);
    this.ambientSource.start(t);
  }

  public stopAmbient() {
    if (!this.ctx || !this.ambientGain || !this.ambientSource) return;

    const t = this.ctx.currentTime;
    // Fade out and stop source
    this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value, t);
    this.ambientGain.gain.linearRampToValueAtTime(0, t + 1.0);

    const sourceToStop = this.ambientSource;
    this.ambientSource = null;

    setTimeout(() => {
      try {
        sourceToStop.stop();
        sourceToStop.disconnect();
      } catch (e) {
        // Source might already have stopped
      }
    }, 1100);
  }
}

// Export singleton instance
export const soundSynth = typeof window !== 'undefined' ? new SoundSynth() : (null as any);
export default soundSynth;
