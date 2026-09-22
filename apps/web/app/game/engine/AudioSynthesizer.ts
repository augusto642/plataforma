/**
 * AudioSynthesizer.ts
 * NEXUS CODE - Canvas 2D Game Engine
 * 
 * Sintetizador procedural retro chiptune 8-bit usando Web Audio API puro.
 * Síntese procedural de áudio estilo Chiptune 8-bit / 16-bit para efeitos sonoros táteis,
 * inspirado nas eras douradas dos RPGs clássicos de GBA/Game Boy.
 */

export type OscillatorWaveType = 'square' | 'sine' | 'triangle' | 'sawtooth';

export interface ToneOptions {
  frequency: number;
  duration: number;
  type?: OscillatorWaveType;
  volume?: number;
  pitchBendTo?: number;
  decay?: number;
}

export class AudioSynthesizer {
  private static _instance: AudioSynthesizer | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private _isMuted: boolean = false;
  private _masterVolume: number = 0.3; // Volume padrão confortável
  private _isInitialized: boolean = false;

  constructor() {
    this._tryInitContext();
  }

  /**
   * Singleton pattern para fácil acesso global no motor de jogo
   */
  public static getInstance(): AudioSynthesizer {
    if (!AudioSynthesizer._instance) {
      AudioSynthesizer._instance = new AudioSynthesizer();
    }
    return AudioSynthesizer._instance;
  }

  private _tryInitContext(): boolean {
    if (typeof window === 'undefined') return false;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioCtx) return false;

      try {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(
          this._isMuted ? 0 : this._masterVolume,
          this.ctx.currentTime
        );
        this.masterGain.connect(this.ctx.destination);
        this._isInitialized = true;
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * Garante inicialização do contexto de áudio em resposta a uma interação do usuário
   */
  public async resume(): Promise<void> {
    if (!this.ctx) {
      this._tryInitContext();
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // Ignora caso não permitido ainda pelo navegador
      }
    }
  }

  /**
   * Encerra o contexto de áudio e limpa recursos no unmount
   */
  public close(): void {
    if (this.ctx && this.ctx.state !== 'closed') {
      try {
        void this.ctx.close();
      } catch {
        // Ignora se já estiver fechado
      }
      this.ctx = null;
      this.masterGain = null;
      this._isInitialized = false;
    }
  }

  public get isMuted(): boolean {
    return this._isMuted;
  }

  public get volume(): number {
    return this._masterVolume;
  }

  /**
   * Altera o volume mestre (0.0 a 1.0)
   */
  public setVolume(volume: number): void {
    this._masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.ctx && !this._isMuted) {
      this.masterGain.gain.setValueAtTime(this._masterVolume, this.ctx.currentTime);
    }
  }

  /**
   * Silencia todo o áudio do jogo
   */
  public mute(): void {
    this._isMuted = true;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  /**
   * Restaura o som do jogo
   */
  public unmute(): void {
    this._isMuted = false;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this._masterVolume, this.ctx.currentTime);
    }
  }

  public toggleMute(): boolean {
    if (this._isMuted) {
      this.unmute();
    } else {
      this.mute();
    }
    return this._isMuted;
  }

  /**
   * Gera um tom sintetizado genérico
   */
  public playTone({
    frequency,
    duration,
    type = 'square',
    volume = 0.5,
    pitchBendTo,
    decay,
  }: ToneOptions): void {
    if (this._isMuted || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, now);

      if (pitchBendTo !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(1, pitchBendTo),
          now + duration
        );
      }

      const noteVolume = volume * this._masterVolume;
      gain.gain.setValueAtTime(noteVolume, now);

      const decayTime = decay || duration;
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + decayTime
      );

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Audio node failure fallback
    }
  }

  /**
   * Gera rajada de ruído branco (White Noise) filtrado para impactos retro
   */
  public playNoise(
    duration: number,
    filterFreq: number = 800,
    volume: number = 0.4
  ): void {
    if (this._isMuted || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;
      gain.gain.setValueAtTime(volume * this._masterVolume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + duration);
    } catch {
      // Fail safely
    }
  }

  // ==========================================
  // EFEITOS SONOROS ESPECÍFICOS DO JOGO
  // ==========================================

  /**
   * 1. Footstep: Som sutil de passo em grama / piso de laboratório (8-bit soft thud)
   */
  public playFootstep(): void {
    if (this._isMuted || !this.ctx) return;
    this.playTone({
      frequency: 110,
      pitchBendTo: 55,
      duration: 0.045,
      type: 'triangle',
      volume: 0.15,
      decay: 0.04,
    });
  }

  /**
   * 2. Bump / Collision: Som de colisão com parede ou obstáculo (dull low thud)
   */
  public playCollision(): void {
    if (this._isMuted || !this.ctx) return;
    this.playTone({
      frequency: 160,
      pitchBendTo: 40,
      duration: 0.08,
      type: 'square',
      volume: 0.35,
      decay: 0.075,
    });
  }


  /**
   * 4. Hit: Impacto de ataque / golpe crítico em batalha
   * Combina explosão curta de ruído branco com pitch slide descendente de onda quadrada
   */
  public playHit(): void {
    if (this._isMuted || !this.ctx) return;
    // Ruído percussivo
    this.playNoise(0.12, 1200, 0.5);

    // Punch tonal
    this.playTone({
      frequency: 380,
      pitchBendTo: 50,
      duration: 0.14,
      type: 'sawtooth',
      volume: 0.45,
      decay: 0.12,
    });
  }

  /**
   * 5. Victory Fanfare: Fanfarra de vitória retro 8-bit comemorativa
   * Sequência triunfante de notas ao derrotar um monstro/bug ou resolver o desafio de código
   */
  public playVictory(): void {
    if (this._isMuted || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    try {
      const now = this.ctx.currentTime;
      // C5, D5, E5, F5, G5, A5, B5, C6 com timing de fanfarra épica
      const fanfare = [
        { freq: 523.25, time: 0.00, dur: 0.10 }, // C5
        { freq: 523.25, time: 0.11, dur: 0.10 }, // C5
        { freq: 523.25, time: 0.22, dur: 0.10 }, // C5
        { freq: 523.25, time: 0.33, dur: 0.25 }, // C5 (segura)
        { freq: 415.30, time: 0.60, dur: 0.25 }, // G#4
        { freq: 466.16, time: 0.88, dur: 0.25 }, // A#4
        { freq: 523.25, time: 1.15, dur: 0.18 }, // C5
        { freq: 466.16, time: 1.34, dur: 0.10 }, // A#4
        { freq: 523.25, time: 1.46, dur: 0.55 }, // C5 (triunfo final)
      ];

      fanfare.forEach(({ freq, time, dur }) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + time);

        // Adiciona um leve vibrato na última nota longa
        if (dur > 0.4) {
          const lfo = this.ctx!.createOscillator();
          const lfoGain = this.ctx!.createGain();
          lfo.frequency.setValueAtTime(6, now + time); // 6 Hz vibrato
          lfoGain.gain.setValueAtTime(8, now + time); // amplitude de pitch
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfo.start(now + time);
          lfo.stop(now + time + dur);
        }

        const vol = 0.4 * this._masterVolume;
        gain.gain.setValueAtTime(vol, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch {
      // Graceful degradation
    }
  }

  /**
   * 6. Silence All: Corta imediatamente qualquer oscilador ou ganho ativo agendado.
   * Previne vazamento de nós de áudio em desmontagens rápidas ou transições de rota.
   */
  public silenceAll(): void {
    if (!this.ctx || !this.masterGain) return;
    try {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(0, now);

      setTimeout(() => {
        if (this.masterGain && this.ctx) {
          const restoredVol = this._isMuted ? 0 : this._masterVolume;
          this.masterGain.gain.setValueAtTime(restoredVol, this.ctx.currentTime);
        }
      }, 50);
    } catch {
      // Silêncio defensivo
    }
  }

  /**
   * 7. Level Up / Teleport: Arpejo ascendente futurista para teleporte quântico e evolução
   */
  public playLevelUp(): void {
    if (this._isMuted || !this.ctx) return;
    this.playTone({
      frequency: 523.25,
      pitchBendTo: 1046.5,
      duration: 0.18,
      type: 'sine',
      volume: 0.4,
      decay: 0.15,
    });
  }

  public playTeleport(): void {
    this.playLevelUp();
  }

  /**
   * 8. Card Flip: Som sutil de manuseio de carta colecionável ou flip holográfico
   */
  public playCardFlip(): void {
    if (this._isMuted || !this.ctx) return;
    this.playTone({
      frequency: 580,
      pitchBendTo: 820,
      duration: 0.06,
      type: 'sine',
      volume: 0.22,
      decay: 0.05,
    });
  }

  /**
   * 9. Holo Hover: Som suave cintilante ao passar sobre reflexo holográfico
   */
  public playHoloHover(): void {
    if (this._isMuted || !this.ctx) return;
    this.playTone({
      frequency: 920,
      pitchBendTo: 1180,
      duration: 0.05,
      type: 'triangle',
      volume: 0.15,
      decay: 0.04,
    });
  }

  /**
   * 10. Lumi Socratic Chirp: Som suave de digitação / pensamento de Lumi
   */
  public playLumiChirp(): void {
    if (this._isMuted || !this.ctx) return;
    this.playTone({
      frequency: 740,
      pitchBendTo: 880,
      duration: 0.035,
      type: 'sine',
      volume: 0.12,
      decay: 0.03,
    });
  }

  /**
   * 11. Mascote Gato Preto: Miado 8-bit procedural com formante felina e modulação de frequência
   */
  public playCatMeow(mood: 'happy' | 'alert' | 'sleepy' | 'curious' = 'happy'): void {
    if (this._isMuted || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();

    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc2.type = 'sawtooth';

      let startFreq = 440;
      let peakFreq = 880;
      let endFreq = 380;
      let duration = 0.38;

      if (mood === 'alert') {
        startFreq = 620;
        peakFreq = 1200;
        endFreq = 540;
        duration = 0.22;
      } else if (mood === 'sleepy') {
        startFreq = 380;
        peakFreq = 520;
        endFreq = 260;
        duration = 0.55;
      } else if (mood === 'curious') {
        startFreq = 400;
        peakFreq = 960;
        endFreq = 780; // Final ascendente interrogativo
        duration = 0.32;
      }

      osc1.frequency.setValueAtTime(startFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(peakFreq, now + duration * 0.25);
      osc1.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

      osc2.frequency.setValueAtTime(startFreq * 1.5, now);
      osc2.frequency.exponentialRampToValueAtTime(peakFreq * 1.5, now + duration * 0.25);
      osc2.frequency.exponentialRampToValueAtTime(endFreq * 1.5, now + duration);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.Q.setValueAtTime(3.5, now);

      const vol = (mood === 'alert' ? 0.35 : mood === 'sleepy' ? 0.18 : 0.28) * this._masterVolume;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(vol, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch {
      // Graceful degradation
    }
  }

  /**
   * 12. Mascote Gato Preto: Ronrom (Purr) 8-bit com LFO dente de serra a 26 Hz
   */
  public playCatPurr(): void {
    if (this._isMuted || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(82, now); // Frequência do peito do gato

      lfo.type = 'sawtooth';
      lfo.frequency.setValueAtTime(26, now); // Frequência de vibração fonaudial a 26Hz
      lfoGain.gain.setValueAtTime(24, now);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      const vol = 0.22 * this._masterVolume;
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(gain);
      gain.connect(this.masterGain);

      lfo.start(now);
      osc.start(now);
      lfo.stop(now + 0.65);
      osc.stop(now + 0.65);
    } catch {
      // Graceful degradation
    }
  }

  /**
   * 13. Battle Alert: Transição clássica de encontro selvagem / início de combate RPG Pokémon
   */
  public playBattleAlert(): void {
    if (this._isMuted || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();

    try {
      const now = this.ctx.currentTime;
      // Arpejo estroboscópico de alerta: Eb4, G4, Bb4, Eb5, G5, Bb5 seguido de queda percussiva
      const notes = [
        { freq: 311.13, time: 0.00, dur: 0.05 },
        { freq: 392.00, time: 0.05, dur: 0.05 },
        { freq: 466.16, time: 0.10, dur: 0.05 },
        { freq: 622.25, time: 0.15, dur: 0.06 },
        { freq: 783.99, time: 0.21, dur: 0.06 },
        { freq: 932.33, time: 0.27, dur: 0.12 },
        // Impacto dramático descendente
        { freq: 466.16, time: 0.40, dur: 0.08 },
        { freq: 233.08, time: 0.48, dur: 0.22 },
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + time);

        const vol = 0.38 * this._masterVolume;
        gain.gain.setValueAtTime(vol, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch {
      // Graceful degradation
    }
  }

  /**
   * 14. Evolution Fanfare: Jingle triunfal de metamorfose e evolução do starter
   */
  public playEvolutionFanfare(): void {
    if (this._isMuted || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();

    try {
      const now = this.ctx.currentTime;
      // Sequência cintilante: C5, E5, G5, B5, C6, E6, G6
      const fanfare = [
        { freq: 523.25, time: 0.00, dur: 0.08 },
        { freq: 659.25, time: 0.09, dur: 0.08 },
        { freq: 783.99, time: 0.18, dur: 0.08 },
        { freq: 987.77, time: 0.27, dur: 0.10 },
        { freq: 1046.5, time: 0.38, dur: 0.12 },
        { freq: 1318.5, time: 0.52, dur: 0.15 },
        { freq: 1567.9, time: 0.68, dur: 0.60 }, // Nota triunfal longa sustentada
      ];

      fanfare.forEach(({ freq, time, dur }) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + time);

        // Se for a nota final, adiciona vibrato cintilante
        if (dur > 0.3) {
          const lfo = this.ctx!.createOscillator();
          const lfoGain = this.ctx!.createGain();
          lfo.frequency.setValueAtTime(8, now + time);
          lfoGain.gain.setValueAtTime(12, now + time);
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfo.start(now + time);
          lfo.stop(now + time + dur);
        }

        const vol = 0.42 * this._masterVolume;
        gain.gain.setValueAtTime(vol, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch {
      // Graceful degradation
    }
  }
}


