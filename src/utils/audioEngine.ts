import { EqualizerPreset, Track } from '../types';

export const EQUALIZER_FREQUENCIES = [60, 230, 910, 3600, 14000];

export const EQUALIZER_PRESETS: Record<string, EqualizerPreset> = {
  flat: { name: 'Flat', gains: [0, 0, 0, 0, 0] },
  bassBoost: { name: 'Bass Boost', gains: [8, 6, 2, 0, 0] },
  classical: { name: 'Classical', gains: [4, 2, -1, 3, 5] },
  phonk: { name: 'Phonk / Bass', gains: [9, 7, 1, 3, 6] },
  lofi: { name: 'Lofi Chill', gains: [3, 5, 4, -2, -4] },
  vocalBoost: { name: 'Vocal Boost', gains: [-2, 1, 6, 4, 1] },
  electronic: { name: 'Electronic', gains: [6, 4, 0, 4, 6] },
};

class AudioEngine {
  private audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filterNodes: BiquadFilterNode[] = [];
  private gainNode: GainNode | null = null;
  private dryGainNode: GainNode | null = null;
  private wetGainNode: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackGainNode: GainNode | null = null;
  private reverbFilterNode: BiquadFilterNode | null = null;
  private preloadAudio: HTMLAudioElement | null = null;
  private isGraphConnected = false;
  private currentGains: number[] = [0, 0, 0, 0, 0];
  private isReverbActive = false;
  private sleepTimerId: number | null = null;
  private sleepEndTime: number | null = null;
  private isFadingOut = false;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    // Let HTML5 audio play natively by default with zero crackling / glitching
    // @ts-expect-error preservesPitch property
    this.audio.preservesPitch = true;
  }

  public getAudioElement(): HTMLAudioElement {
    return this.audio;
  }

  /**
   * Resume AudioContext if it exists and is suspended (called during user interactions)
   */
  public resumeContext(): void {
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  /**
   * Lazy-Connect Web Audio API graph:
   * Only called when the user actively adjusts an EQ slider away from 0dB OR enables Slowed + Reverb.
   * If both are inactive, the HTML5 <audio> plays natively through device hardware output.
   */
  public connectGraphIfNeeded(): void {
    if (this.isGraphConnected) {
      this.resumeContext();
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      this.audioCtx = new AudioContextClass();
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 1.0;

      this.dryGainNode = this.audioCtx.createGain();
      this.dryGainNode.gain.value = 1.0;

      // Setup 5-band Equalizer filters
      this.filterNodes = EQUALIZER_FREQUENCIES.map((freq, index) => {
        const filter = this.audioCtx!.createBiquadFilter();
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === EQUALIZER_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.0;
        }
        filter.frequency.value = freq;
        filter.gain.value = this.currentGains[index] || 0;
        return filter;
      });

      // Chain: sourceNode -> Filter 0 -> Filter 1 ... -> Filter 4
      let lastNode: AudioNode = this.sourceNode;
      for (const filter of this.filterNodes) {
        lastNode.connect(filter);
        lastNode = filter;
      }

      // Dry path: EQ output -> dryGain -> master gain
      lastNode.connect(this.dryGainNode);
      this.dryGainNode.connect(this.gainNode);

      // Lightweight stereo Feedback Delay Reverb:
      // DelayNode(0.18s) + GainNode(0.22) + BiquadFilterNode lowpass at 2800Hz
      this.delayNode = this.audioCtx.createDelay(1.0);
      this.delayNode.delayTime.value = 0.18;

      this.reverbFilterNode = this.audioCtx.createBiquadFilter();
      this.reverbFilterNode.type = 'lowpass';
      this.reverbFilterNode.frequency.value = 2800;

      this.feedbackGainNode = this.audioCtx.createGain();
      this.feedbackGainNode.gain.value = 0.22;

      this.wetGainNode = this.audioCtx.createGain();
      this.wetGainNode.gain.value = this.isReverbActive ? 0.25 : 0.0;

      // Reverb feedback loop: EQ output -> delay -> lowpass -> feedback -> delay
      lastNode.connect(this.delayNode);
      this.delayNode.connect(this.reverbFilterNode);
      this.reverbFilterNode.connect(this.feedbackGainNode);
      this.feedbackGainNode.connect(this.delayNode);

      // Reverb wet output: lowpass -> wetGain -> master gain
      this.reverbFilterNode.connect(this.wetGainNode);
      this.wetGainNode.connect(this.gainNode);

      // Master output to destination
      this.gainNode.connect(this.audioCtx.destination);

      this.isGraphConnected = true;
    } catch (err) {
      console.warn("Could not connect Web Audio API graph:", err);
    }
  }

  public setEqualizerGains(gains: number[]): void {
    this.currentGains = [...gains];
    const hasActiveGains = gains.some((g) => Math.abs(g) > 0.01);

    if (hasActiveGains) {
      this.connectGraphIfNeeded();
    }

    if (this.isGraphConnected && this.audioCtx) {
      this.filterNodes.forEach((filter, idx) => {
        if (filter) {
          const val = gains[idx] ?? 0;
          filter.gain.setTargetAtTime(val, this.audioCtx!.currentTime, 0.05);
        }
      });
    }
  }

  public applyPreset(presetKey: string): number[] {
    const preset = EQUALIZER_PRESETS[presetKey] || EQUALIZER_PRESETS.flat;
    this.setEqualizerGains(preset.gains);
    return preset.gains;
  }

  public setPlaybackRate(rate: number, preservesPitch = true): void {
    this.audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    // @ts-expect-error preservesPitch property
    this.audio.preservesPitch = preservesPitch;
    // @ts-expect-error mozPreservesPitch
    this.audio.mozPreservesPitch = preservesPitch;
    // @ts-expect-error webkitPreservesPitch
    this.audio.webkitPreservesPitch = preservesPitch;
  }

  public setReverbEnabled(enabled: boolean): void {
    this.isReverbActive = enabled;
    if (enabled) {
      this.connectGraphIfNeeded();
    }

    if (this.isGraphConnected && this.wetGainNode && this.audioCtx) {
      const targetWet = enabled ? 0.25 : 0.0;
      this.wetGainNode.gain.setTargetAtTime(targetWet, this.audioCtx.currentTime, 0.08);
    }
  }

  public fadeOut(durationSec: number): void {
    if (this.isGraphConnected && this.gainNode && this.audioCtx && durationSec > 0) {
      this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.audioCtx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + durationSec);
    } else if (durationSec > 0) {
      const startVol = this.audio.volume;
      const steps = 10;
      const stepDuration = (durationSec * 1000) / steps;
      let currentStep = 0;
      const fadeInterval = window.setInterval(() => {
        currentStep++;
        this.audio.volume = Math.max(0, startVol * (1 - currentStep / steps));
        if (currentStep >= steps) {
          clearInterval(fadeInterval);
        }
      }, stepDuration);
    }
  }

  public fadeIn(durationSec: number): void {
    if (this.isGraphConnected && this.gainNode && this.audioCtx && durationSec > 0) {
      this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.gainNode.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(1.0, this.audioCtx.currentTime + durationSec);
    } else if (durationSec > 0) {
      this.audio.volume = 0.05;
      const steps = 10;
      const stepDuration = (durationSec * 1000) / steps;
      let currentStep = 0;
      const fadeInterval = window.setInterval(() => {
        currentStep++;
        this.audio.volume = Math.min(1.0, currentStep / steps);
        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          this.audio.volume = 1.0;
        }
      }, stepDuration);
    } else {
      this.audio.volume = 1.0;
    }
  }

  public resetMasterGain(): void {
    if (this.isGraphConnected && this.gainNode && this.audioCtx) {
      this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.gainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
    }
    this.audio.volume = 1.0;
  }

  public preloadTrack(url: string): void {
    if (!url) return;
    try {
      if (!this.preloadAudio) {
        this.preloadAudio = new Audio();
      }
      this.preloadAudio.src = url;
      this.preloadAudio.preload = 'auto';
      this.preloadAudio.load();
    } catch {
      // ignore
    }
  }

  public setVolume(volume: number): void {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }

  public startSleepTimer(minutes: number, onComplete?: () => void): void {
    this.clearSleepTimer();
    const durationMs = minutes * 60 * 1000;
    this.sleepEndTime = Date.now() + durationMs;
    this.isFadingOut = false;

    this.sleepTimerId = window.setInterval(() => {
      if (!this.sleepEndTime) return;
      const remainingMs = this.sleepEndTime - Date.now();

      if (remainingMs <= 20000 && !this.isFadingOut) {
        this.isFadingOut = true;
        this.fadeOut(remainingMs / 1000);
      }

      if (remainingMs <= 0) {
        this.clearSleepTimer();
        this.audio.pause();
        this.resetMasterGain();
        if (onComplete) onComplete();
      }
    }, 1000);
  }

  public clearSleepTimer(): void {
    if (this.sleepTimerId !== null) {
      clearInterval(this.sleepTimerId);
      this.sleepTimerId = null;
    }
    this.sleepEndTime = null;
    this.isFadingOut = false;
    this.resetMasterGain();
  }

  public getSleepTimerRemaining(): number | null {
    if (!this.sleepEndTime) return null;
    const diff = Math.max(0, Math.floor((this.sleepEndTime - Date.now()) / 1000));
    return diff;
  }

  public updateMediaSession(
    track: Track,
    handlers: {
      onPlay: () => void;
      onPause: () => void;
      onNext: () => void;
      onPrev: () => void;
      onSeek: (time: number) => void;
    }
  ): void {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || 'Raag Player',
        artwork: track.coverArt
          ? [
              { src: track.coverArt, sizes: '96x96', type: 'image/jpeg' },
              { src: track.coverArt, sizes: '256x256', type: 'image/jpeg' },
              { src: track.coverArt, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [],
      });

      navigator.mediaSession.setActionHandler('play', handlers.onPlay);
      navigator.mediaSession.setActionHandler('pause', handlers.onPause);
      navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrev);
      navigator.mediaSession.setActionHandler('nexttrack', handlers.onNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          handlers.onSeek(details.seekTime);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        handlers.onSeek(Math.max(0, this.audio.currentTime - offset));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        handlers.onSeek(Math.min(this.audio.duration || 0, this.audio.currentTime + offset));
      });
    } catch (err) {
      console.warn("MediaSession error:", err);
    }
  }

  public updateMediaSessionPlaybackState(isPlaying: boolean): void {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch {
      // Ignore
    }
  }

  public updateMediaSessionPositionState(): void {
    if (!('mediaSession' in navigator) || !this.audio.duration) return;
    try {
      if ('setPositionState' in navigator.mediaSession) {
        navigator.mediaSession.setPositionState({
          duration: isFinite(this.audio.duration) ? this.audio.duration : 0,
          playbackRate: this.audio.playbackRate,
          position: isFinite(this.audio.currentTime) ? this.audio.currentTime : 0,
        });
      }
    } catch {
      // Ignore
    }
  }
}

export const audioEngine = new AudioEngine();
