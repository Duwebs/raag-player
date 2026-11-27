import { EqualizerPreset, Track } from '../types';

export const EQUALIZER_FREQUENCIES = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
export const EQUALIZER_BAND_LABELS = ['31', '63', '125', '250', '500', '1K', '2K', '4K', '8K', '16K'];

export const EQUALIZER_PRESETS: Record<string, EqualizerPreset> = {
  custom: { name: 'Custom', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  bassBooster: { name: 'Bass booster', gains: [7, 6, 4, 2, 0, 0, 0, 0, 0, 0] },
  vocalBooster: { name: 'Vocal booster', gains: [-2, -2, -1, 1, 3, 5, 5, 3, 1, 0] },
  trebleBooster: { name: 'Treble booster', gains: [0, 0, 0, 0, 0, 2, 4, 6, 7, 8] },
  normal: { name: 'Normal', gains: [3, 1, 1, 0, -1, 0, 0, 0, 1, 1] },
  pop: { name: 'Pop', gains: [-1, 1, 3, 4, 3, 1, -1, 1, 3, 4] },
  hiphop: { name: 'HipHop', gains: [6, 5, 3, 1, -1, -1, 1, 2, 4, 5] },
  rock: { name: 'Rock', gains: [5, 4, 2, 0, -1, -1, 2, 4, 5, 6] },
  electronic: { name: 'Electronic', gains: [5, 4, 1, 0, -2, 2, 1, 3, 5, 6] },
  heavyMetal: { name: 'Heavy metal', gains: [4, 2, 2, 4, 0, -2, 3, 5, 6, 5] },
  rnb: { name: 'R&B', gains: [4, 6, 3, 1, -2, 1, 2, 3, 3, 4] },
  folk: { name: 'Folk', gains: [2, 1, 0, 1, 3, 2, 1, 2, 2, 0] },
  dance: { name: 'Dance', gains: [6, 5, 2, 0, 0, 2, 4, 4, 3, 2] },
  jazz: { name: 'Jazz', gains: [3, 2, 1, 2, -1, -1, 1, 2, 3, 4] },
  classic: { name: 'Classic', gains: [4, 3, 1, 0, -1, 0, 1, 3, 4, 5] },
  latin: { name: 'Latin', gains: [4, 2, 0, 0, -1, -1, 0, 2, 4, 5] },
};

export function normalizeEqGains(gains?: number[]): number[] {
  if (!Array.isArray(gains) || gains.length === 0) {
    return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  }
  if (gains.length === 10) {
    return gains.map((g) => Math.max(-12, Math.min(12, Math.round(Number(g) || 0))));
  }
  // Gracefully expand legacy 5-band array into 10-band curve
  if (gains.length === 5) {
    return [
      gains[0] || 0,
      gains[0] || 0,
      gains[1] || 0,
      gains[1] || 0,
      gains[2] || 0,
      gains[2] || 0,
      gains[3] || 0,
      gains[3] || 0,
      gains[4] || 0,
      gains[4] || 0,
    ].map((g) => Math.max(-12, Math.min(12, Math.round(Number(g) || 0))));
  }
  return EQUALIZER_FREQUENCIES.map((_, idx) =>
    Math.max(-12, Math.min(12, Math.round(Number(gains[idx]) || 0)))
  );
}

class AudioEngine {
  private audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private filterNodes: BiquadFilterNode[] = [];
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private dryGainNode: GainNode | null = null;
  private wetGainNode: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private feedbackGainNode: GainNode | null = null;
  private reverbFilterNode: BiquadFilterNode | null = null;
  private preloadAudio: HTMLAudioElement | null = null;
  private isGraphConnected = false;
  private currentGains: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  private isEqEnabled = true;
  private isReverbActive = false;
  private isVisualizerActive = false;
  private sleepTimerId: number | null = null;
  private sleepEndTime: number | null = null;
  private isFadingOut = false;
  private fallbackArtworkDataUrl: string | null = null;
  private isGeneratingFallbackArt = false;

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

      // Setup 10-band Equalizer filters
      this.filterNodes = EQUALIZER_FREQUENCIES.map((freq, index) => {
        const filter = this.audioCtx!.createBiquadFilter();
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === EQUALIZER_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.4;
        }
        filter.frequency.value = freq;
        filter.gain.value = this.isEqEnabled ? this.currentGains[index] || 0 : 0;
        return filter;
      });

      // Chain: sourceNode -> Filter 0 ... -> Filter 9
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

      // Real-time AnalyserNode for Music Visualizers
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = 128;
      this.analyserNode.smoothingTimeConstant = 0.82;

      // Master output -> Analyser -> destination
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioCtx.destination);

      this.isGraphConnected = true;
    } catch (err) {
      console.warn("Could not connect Web Audio API graph:", err);
    }
  }

  public setEqualizerEnabled(enabled: boolean): void {
    this.isEqEnabled = enabled;
    const hasActiveGains = this.currentGains.some((g) => Math.abs(g) > 0.01);
    if (enabled && hasActiveGains) {
      this.connectGraphIfNeeded();
    }
    this.syncFilterNodes();
  }

  public setEqualizerGains(gains: number[], enabled?: boolean): void {
    this.currentGains = normalizeEqGains(gains);
    if (typeof enabled === 'boolean') {
      this.isEqEnabled = enabled;
    }
    const hasActiveGains = this.isEqEnabled && this.currentGains.some((g) => Math.abs(g) > 0.01);

    if (hasActiveGains) {
      this.connectGraphIfNeeded();
    }

    this.syncFilterNodes();
  }

  private syncFilterNodes(): void {
    if (this.isGraphConnected && this.audioCtx) {
      this.filterNodes.forEach((filter, idx) => {
        if (filter) {
          const val = this.isEqEnabled ? this.currentGains[idx] ?? 0 : 0;
          filter.gain.setTargetAtTime(val, this.audioCtx!.currentTime, 0.04);
        }
      });
    }
  }

  public applyPreset(presetKey: string): number[] {
    const preset = EQUALIZER_PRESETS[presetKey] || EQUALIZER_PRESETS.normal;
    this.setEqualizerGains(preset.gains);
    return [...preset.gains];
  }

  public setVisualizerEnabled(enabled: boolean): void {
    this.isVisualizerActive = enabled;
    if (enabled && !this.audio.paused) {
      this.connectGraphIfNeeded();
    }
  }

  public getFrequencyData(target: Uint8Array): boolean {
    if (!this.isGraphConnected && this.isVisualizerActive && !this.audio.paused) {
      this.connectGraphIfNeeded();
    }
    if (!this.isGraphConnected || !this.analyserNode || this.audio.paused) {
      return false;
    }
    this.resumeContext();
    this.analyserNode.getByteFrequencyData(target);
    return true;
  }

  public async getAudioOutputLabel(): Promise<string> {
    try {
      if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const btOrWired = devices.find(
          (d) =>
            d.kind === 'audiooutput' &&
            d.label &&
            !/default|speaker|communications/i.test(d.label)
        );
        if (btOrWired?.label) {
          return btOrWired.label.replace(/\s*\(.*?\)\s*$/, '').trim() || 'Connected Audio';
        }
      }
    } catch {
      // ignore unavailable API in sandboxed WebView
    }
    return 'Phone Speaker';
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

  private ensureFallbackArtwork(onReady?: () => void): string {
    if (this.fallbackArtworkDataUrl) {
      return this.fallbackArtworkDataUrl;
    }

    const originPng =
      typeof window !== 'undefined' ? `${window.location.origin}/icon-512.png` : '/icon-512.png';
    const originSvg =
      typeof window !== 'undefined' ? `${window.location.origin}/icon.svg` : '/icon.svg';

    if (!this.isGeneratingFallbackArt && typeof document !== 'undefined') {
      this.isGeneratingFallbackArt = true;
      const paintFallback = (srcUrl: string, allowSvgRetry: boolean) => {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 512;
              canvas.height = 512;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#050505';
                ctx.fillRect(0, 0, 512, 512);
                ctx.drawImage(img, 0, 0, 512, 512);
                this.fallbackArtworkDataUrl = canvas.toDataURL('image/png');
                if (onReady) onReady();
              }
            } catch {
              // ignore canvas failure
            }
          };
          img.onerror = () => {
            if (allowSvgRetry) {
              paintFallback(originSvg, false);
            }
          };
          img.src = srcUrl;
        } catch {
          // ignore image failure
        }
      };
      paintFallback(originPng, true);
    }

    return originPng;
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

    const applyMetadata = () => {
      try {
        const fallbackArt = this.ensureFallbackArtwork(() => {
          if (!track.coverArt) {
            applyMetadata();
          }
        });

        const artwork: MediaImage[] = track.coverArt
          ? [
              { src: track.coverArt, sizes: '96x96', type: 'image/jpeg' },
              { src: track.coverArt, sizes: '256x256', type: 'image/jpeg' },
              { src: track.coverArt, sizes: '512x512', type: 'image/jpeg' },
            ]
          : [
              {
                src: fallbackArt,
                sizes: '512x512',
                type: fallbackArt.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
              },
            ];

        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title || 'Raag Player',
          artist: track.artist || 'Unknown Artist',
          album: 'Raag Player',
          artwork,
        });
      } catch (err) {
        console.warn('MediaSession metadata error:', err);
      }
    };

    try {
      applyMetadata();

      navigator.mediaSession.setActionHandler('play', handlers.onPlay);
      navigator.mediaSession.setActionHandler('pause', handlers.onPause);
      navigator.mediaSession.setActionHandler('previoustrack', handlers.onPrev);
      navigator.mediaSession.setActionHandler('nexttrack', handlers.onNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && isFinite(details.seekTime)) {
          handlers.onSeek(Math.max(0, details.seekTime));
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        const offset = details.seekOffset || 10;
        handlers.onSeek(Math.max(0, this.audio.currentTime - offset));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const offset = details.seekOffset || 10;
        const maxDur = isFinite(this.audio.duration) ? this.audio.duration : 0;
        handlers.onSeek(Math.min(maxDur, this.audio.currentTime + offset));
      });
    } catch (err) {
      console.warn('MediaSession handler error:', err);
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
    if (!('mediaSession' in navigator) || !this.audio.duration || !isFinite(this.audio.duration)) {
      return;
    }
    try {
      if ('setPositionState' in navigator.mediaSession) {
        const dur = Math.max(0, this.audio.duration);
        const pos = Math.min(dur, Math.max(0, isFinite(this.audio.currentTime) ? this.audio.currentTime : 0));
        navigator.mediaSession.setPositionState({
          duration: dur,
          playbackRate: this.audio.playbackRate > 0 ? this.audio.playbackRate : 1,
          position: pos,
        });
      }
    } catch {
      // Ignore
    }
  }
}

export const audioEngine = new AudioEngine();
