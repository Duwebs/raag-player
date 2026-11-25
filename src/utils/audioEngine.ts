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

function createStereoReverbBuffer(ctx: AudioContext, duration = 2.4, decay = 2.0): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = ctx.createBuffer(2, length, sampleRate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = Math.pow(1 - i / length, decay);
    left[i] = (Math.random() * 2 - 1) * n;
    right[i] = (Math.random() * 2 - 1) * n;
  }
  return impulse;
}

class AudioEngine {
  private audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filterNodes: BiquadFilterNode[] = [];
  private gainNode: GainNode | null = null;
  private dryGainNode: GainNode | null = null;
  private wetGainNode: GainNode | null = null;
  private convolverNode: ConvolverNode | null = null;
  private preloadAudio: HTMLAudioElement | null = null;
  private isInitialized = false;
  private sleepTimerId: number | null = null;
  private sleepEndTime: number | null = null;
  private isFadingOut = false;

  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
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
      this.dryGainNode = this.audioCtx.createGain();
      this.dryGainNode.gain.value = 1.0;

      this.convolverNode = this.audioCtx.createConvolver();
      this.convolverNode.buffer = createStereoReverbBuffer(this.audioCtx);

      this.wetGainNode = this.audioCtx.createGain();
      this.wetGainNode.gain.value = 0.0; // 0% wet by default

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

      // Connect: Source -> Filter 0 -> Filter 1 ... -> Filter 4
      let lastNode: AudioNode = this.sourceNode;
      for (const filter of this.filterNodes) {
        lastNode.connect(filter);
        lastNode = filter;
      }

      // Parallel Dry and Wet Reverb routing
      lastNode.connect(this.dryGainNode);
      lastNode.connect(this.convolverNode);
      this.convolverNode.connect(this.wetGainNode);

      this.dryGainNode.connect(this.gainNode);
      this.wetGainNode.connect(this.gainNode);
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

  public setPlaybackRate(rate: number, preservesPitch = true): void {
    this.audio.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    // Support slowed + reverb tape pitch drop
    // @ts-expect-error preservesPitch property
    this.audio.preservesPitch = preservesPitch;
    // @ts-expect-error mozPreservesPitch
    this.audio.mozPreservesPitch = preservesPitch;
    // @ts-expect-error webkitPreservesPitch
    this.audio.webkitPreservesPitch = preservesPitch;
  }

  public setReverbEnabled(enabled: boolean): void {
    this.initAudioContext();
    if (this.wetGainNode && this.audioCtx) {
      const targetWet = enabled ? 0.25 : 0.0;
      this.wetGainNode.gain.setTargetAtTime(targetWet, this.audioCtx.currentTime, 0.08);
    }
  }

  public fadeOut(durationSec: number): void {
    this.initAudioContext();
    if (this.gainNode && this.audioCtx && durationSec > 0) {
      this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.gainNode.gain.setValueAtTime(this.gainNode.gain.value, this.audioCtx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(0.01, this.audioCtx.currentTime + durationSec);
    }
  }

  public fadeIn(durationSec: number): void {
    this.initAudioContext();
    if (this.gainNode && this.audioCtx && durationSec > 0) {
      this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.gainNode.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
      this.gainNode.gain.linearRampToValueAtTime(1.0, this.audioCtx.currentTime + durationSec);
    } else if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
    }
  }

  public resetMasterGain(): void {
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.cancelScheduledValues(this.audioCtx.currentTime);
      this.gainNode.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
    }
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
