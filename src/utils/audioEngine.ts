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
  private isInitialized = false;
  private sleepTimerId: number | null = null;
  private sleepEndTime: number | null = null;
  private isFadingOut = false;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';
  }

  public getAudioElement(): HTMLAudioElement {
    return this.audio;
  }

  public initAudioContext(): void {
    if (this.isInitialized) {
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);
      this.gainNode = this.audioCtx.createGain();

      // Setup 5-band Equalizer
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
        filter.gain.value = 0;
        return filter;
      });

      // Connect: Source -> Filter 0 -> Filter 1 ... -> Filter 4 -> Gain -> Destination
      let lastNode: AudioNode = this.sourceNode;
      for (const filter of this.filterNodes) {
        lastNode.connect(filter);
        lastNode = filter;
      }
      lastNode.connect(this.gainNode);
      this.gainNode.connect(this.audioCtx.destination);

      this.isInitialized = true;
    } catch (err) {
      console.warn("Could not initialize Web Audio API graph:", err);
    }
  }

  public setEqualizerGains(gains: number[]): void {
    this.initAudioContext();
    gains.forEach((gainVal, idx) => {
      if (this.filterNodes[idx] && this.audioCtx) {
        this.filterNodes[idx].gain.setTargetAtTime(gainVal, this.audioCtx.currentTime, 0.05);
      }
    });
  }

  public applyPreset(presetKey: string): number[] {
    const preset = EQUALIZER_PRESETS[presetKey] || EQUALIZER_PRESETS.flat;
    this.setEqualizerGains(preset.gains);
    return preset.gains;
  }

  public setPlaybackRate(rate: number): void {
    this.audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
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

      // Begin smooth fade-out in final 20 seconds
      if (remainingMs <= 20000 && !this.isFadingOut && this.gainNode && this.audioCtx) {
        this.isFadingOut = true;
        const fadeDuration = remainingMs / 1000;
        this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(0.001, this.audioCtx.currentTime + fadeDuration);
      }

      if (remainingMs <= 0) {
        this.clearSleepTimer();
        this.audio.pause();
        if (this.gainNode && this.audioCtx) {
          this.gainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
        }
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
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.gainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
    }
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
