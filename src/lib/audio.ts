/**
 * Dawrak Live Audio and Voice Announcement Engine
 * Uses Web Audio API for synthetic chimes, UI micro-interactions, and Web Speech API / studio audio.
 */

function numberToArabicWords(n: number): string {
  if (n <= 0) return 'صفر';
  const ones = [
    '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة',
    'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'
  ];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

  if (n < 20) return ones[n];
  if (n < 100) {
    const o = n % 10;
    const t = Math.floor(n / 10);
    return o === 0 ? tens[t] : `${ones[o]} و${tens[t]}`;
  }
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    if (rem === 0) return hundreds[h];
    return `${hundreds[h]} و${numberToArabicWords(rem)}`;
  }
  return String(n);
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.85;
  private studioAudio: HTMLAudioElement | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('dawrak_audio_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }
      const savedVol = localStorage.getItem('dawrak_audio_vol');
      if (savedVol !== null) {
        this.volume = parseFloat(savedVol);
      }
      // Note: Audio file is loaded on demand if needed, falling back smoothly to Web Speech API
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('dawrak_audio_muted', String(muted));
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('dawrak_audio_vol', String(this.volume));
    if (this.studioAudio) {
      this.studioAudio.volume = this.volume;
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  /**
   * Subtle, pleasant futuristic whoosh sound for page transitions and section changes
   */
  public playTransitionWhoosh(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // White noise buffer shaped through bandpass filter
      const bufferSize = ctx.sampleRate * 0.35;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(3, now);
      filter.frequency.setValueAtTime(350, now);
      filter.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.35);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.06 * this.volume, now + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + 0.36);
    } catch {
      // Ignore
    }
  }

  /**
   * Subtle, crisp mechanical click sound for button taps
   */
  public playClickSound(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.04 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Ignore
    }
  }

  /**
   * Futuristic SMS chime when simulation notification is transmitted or received
   */
  public playSmsChime(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [659.25, 880.0, 987.77]; // E5, A5, B5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const t = now + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.12 * this.volume, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.26);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Cinematic sci-fi sub-bass sweep & harmonic sonic boom for ElevenLabs-style intro
   */
  public playCinematicIntroSound(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // 1. Sub-bass riser
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(45, now);
      subOsc.frequency.exponentialRampToValueAtTime(110, now + 1.2);
      subOsc.frequency.exponentialRampToValueAtTime(55, now + 2.2);

      subGain.gain.setValueAtTime(0.001, now);
      subGain.gain.linearRampToValueAtTime(0.25 * this.volume, now + 0.8);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 2.5);

      // 2. High-frequency cyber shimmer chord
      const chords = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // C major 7 shimmer
      chords.forEach((freq, idx) => {
        const chordOsc = ctx.createOscillator();
        const chordGain = ctx.createGain();
        const startT = now + 0.4 + idx * 0.09;

        chordOsc.type = 'triangle';
        chordOsc.frequency.setValueAtTime(freq, startT);

        chordGain.gain.setValueAtTime(0.001, startT);
        chordGain.gain.linearRampToValueAtTime(0.08 * this.volume, startT + 0.08);
        chordGain.gain.exponentialRampToValueAtTime(0.001, startT + 1.5);

        chordOsc.connect(chordGain);
        chordGain.connect(ctx.destination);
        chordOsc.start(startT);
        chordOsc.stop(startT + 1.6);
      });
    } catch {
      // Audio fallback
    }
  }

  /**
   * Plays a pleasant two-tone medical chime sound.
   */
  public playChime(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isMuted) return resolve();
      const ctx = this.getAudioContext();
      if (!ctx) return resolve();

      try {
        const now = ctx.currentTime;
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.exponentialRampToValueAtTime(0.28 * this.volume, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        gainNode.connect(ctx.destination);

        // Tone 1: C5 (523.25 Hz)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(523.25, now);
        osc1.connect(gainNode);
        osc1.start(now);
        osc1.stop(now + 0.3);

        // Tone 2: E5 (659.25 Hz)
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now + 0.22);
        osc2.connect(gainNode);
        osc2.start(now + 0.22);
        osc2.stop(now + 0.65);

        setTimeout(() => resolve(), 700);
      } catch (e) {
        console.warn('Audio chime fallback:', e);
        resolve();
      }
    });
  }

  /**
   * Plays celebratory turn fanfare
   */
  public playCelebrationChime(): void {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      const now = ctx.currentTime;

      notes.forEach((freq, index) => {
        const noteStart = now + index * 0.12;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.25 * this.volume, noteStart + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.4);
        gain.connect(ctx.destination);

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);
        osc.connect(gain);
        osc.start(noteStart);
        osc.stop(noteStart + 0.42);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Gentle, warm three-tone harmonic chime when a patient's turn is approaching (1 person ahead)
   * Synthesized entirely with Web Audio API (A4 440Hz -> C#5 554.37Hz -> E5 659.25Hz)
   */
  public playTurnApproachingSound(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isMuted) return resolve();
      const ctx = this.getAudioContext();
      if (!ctx) return resolve();

      try {
        const now = ctx.currentTime;
        const notes = [
          { freq: 440.0, time: 0.0, duration: 0.35 },     // A4
          { freq: 554.37, time: 0.12, duration: 0.45 },   // C#5
          { freq: 659.25, time: 0.24, duration: 0.7 }     // E5
        ];

        notes.forEach(({ freq, time, duration }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + time);

          gain.gain.setValueAtTime(0.001, now + time);
          gain.gain.linearRampToValueAtTime(0.18 * this.volume, now + time + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + time + duration);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + time);
          osc.stop(now + time + duration + 0.05);
        });

        setTimeout(resolve, 1000);
      } catch {
        resolve();
      }
    });
  }

  /**
   * Plays the studio reference voiceover directly
   */
  public playStudioVoice(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isMuted) return resolve(false);
      try {
        if (!this.studioAudio) {
          this.studioAudio = new Audio('/assets/aistudio/Generated_Audio_October_21__2026_-_4_06PM_24727555.wav');
        }
        this.studioAudio.currentTime = 0;
        this.studioAudio.volume = this.volume;
        this.studioAudio.onended = () => resolve(true);
        this.studioAudio.onerror = () => resolve(false);
        this.studioAudio.play().catch(() => resolve(false));
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Voice announcement engine:
   * HARD CONSTRAINT: This function strictly receives ONLY a numeric queueNumber.
   * It never receives, references, or accesses patientName or personal data.
   * If queueNumber is 17 (or studio voice is chosen), it seamlessly uses the studio voiceover!
   * Otherwise, it synthesizes the exact phrase template with native Arabic speech synthesis.
   */
  public async announceNumber(queueNumber: number): Promise<boolean> {
    if (this.isMuted) return false;

    // 1. Play pleasant medical chime first
    await this.playChime();
    await new Promise((r) => setTimeout(r, 400));

    // Special: If queue number is 17, play the studio audio directly for maximum realism
    if (queueNumber === 17) {
      const studioSuccess = await this.playStudioVoice();
      if (studioSuccess) return true;
    }

    // 2. Dynamic Arabic voice announcement matching the exact phrase from the voiceover:
    // "رقم [X] يتفضل بالدخول إلى غرفة الكشف"
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;

    return new Promise((resolve) => {
      try {
        window.speechSynthesis.cancel();

        const words = numberToArabicWords(queueNumber);
        const phrase = `رقم ${words}، يتفضل بالدخول إلى غرفة الكشف.`;
        const fullAnnouncement = `${phrase} ... ${phrase}`;

        const utterance = new SpeechSynthesisUtterance(fullAnnouncement);
        utterance.lang = 'ar-SA';
        utterance.rate = 0.90;
        utterance.pitch = 1.0;
        utterance.volume = this.volume;

        const voices = window.speechSynthesis.getVoices();
        const arabicVoice = voices.find(
          (v) => v.lang.startsWith('ar') || v.lang.includes('Arabic') || v.lang.includes('ar-EG') || v.lang.includes('ar-SA')
        );
        if (arabicVoice) {
          utterance.voice = arabicVoice;
        }

        utterance.onend = () => resolve(true);
        utterance.onerror = () => resolve(false);

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis fallback:', err);
        resolve(false);
      }
    });
  }
}

export const soundEngine = new AudioEngine();
export const audio = soundEngine;
