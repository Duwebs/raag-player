# 🎵 Raag Player — Offline Mobile-First Music PWA

A sleek, native-Android styled offline music player Progressive Web App inspired by **Lark Player**. Built with **React 18, Vite, Tailwind CSS, Lucide Icons, IndexedDB persistent storage, and the Web Audio API**.

---

## ✨ Features & Architecture

### 1. Visual Aesthetics & Lark Player Design
- **Deep Matte-Black Aesthetic**: `#050505` background, `#121214` elevated cards, subtle `1px` borders (`#1E1E22`), and electric blue (`#2563EB` / `#38BDF8`) & saffron/amber highlights.
- **Dynamic Background Color Extraction**: Offscreen HTML5 Canvas algorithm extracts the dominant, vibrant hue from the active album cover art to generate an ambient dark gradient for the full-screen Now Playing sheet.
- **Raag Mascot**: Vector mascot with headphones and cheerful soundwave accents.
- **Tilted Mosaic Background**: Ambient 3D perspective album cover grid fading into dark matte-black on onboarding screens.

### 2. Full Application Flow
1. **Screen A: Onboarding & Language Selection**:
   - Tilted album cover mosaic background.
   - Language selector card: English, हिंदी (Hindi), தமிழ் (Tamil), ગુજરાતી (Gujarati), मराठी (Marathi), ਪੰਜਾਬੀ (Punjabi) with live checkmarks.
   - Full-width rounded "Get started" pill button.
2. **Screen B: Local Folder & Permission Setup**:
   - Android-native permission prompt card: "To play music and audio — Please allow Raag Player to access your music folder".
   - `window.showDirectoryPicker()` integration with multi-audio file fallback (`webkitdirectory`).
   - "Try Demo Music (Offline)" option with 5 pre-packaged Raag and chill tracks.
3. **Screen C: Main Library View (Home)**:
   - Sticky Top Bar: "Raag Player" title, live search filter bar, sorting options (Title, Artist, Duration, Date Added), settings gear.
   - Filter Pills: `Songs`, `Playlists`, `Folders`, `Artists`, `Albums`, `Favorites`.
   - Track Items: `48x48px` rounded-square cover art thumbnails (`12px` radius), title, artist, active EQ soundwave animation, 3-dots action menu.
   - Sticky Glassmorphic Bottom Mini-Player: Track thumbnail, title, tactile circular Play/Pause and Next buttons, tapping expands Now Playing sheet.
4. **Screen D: Full-Screen "Now Playing" Sheet**:
   - Large square album art with `24px` border radius and soft drop shadow.
   - Track title, artist, Favorite heart toggle, options menu.
   - Smooth seekbar with elapsed and total duration timestamps.
   - Tactile oversized playback controls: Previous, huge Play/Pause pill, Next.
   - Bottom Utility Bar:
     - **5-Band Web Audio Equalizer** (60Hz, 230Hz, 910Hz, 3.6kHz, 14kHz) with presets (*Bass Boost, Classical, Phonk/Bass, Lofi Chill, Flat, Vocal Boost, Electronic*).
     - **Synced Karaoke Lyrics** (.LRC parser with live auto-scroll and line seek).
     - **Playback Modes**: Loop All, Loop One, Shuffle, and Queue Drawer.
5. **Screen E: Settings View**:
   - Grouped cards:
     - **Listening Stats & Storage**: Live-tracked `Playtime` duration, Rescan Folders / Storage Cache.
     - **Customization**: Theme (*Pure Matte Black #000000, Lark Dark #050505, Dynamic Art*), Sleep Timer (*15m, 30m, 45m, 60m with gentle fade-out*).
     - **Library Management**: Hidden files, Recently deleted (restore deleted tracks), Playback settings (*playback speed 0.5x–2.0x, gapless playback, crossfade*), Language switcher.
     - **About**: Version 1.0.0, offline PWA stats.

### 3. Audio & Offline Engineering
- **Persistent IndexedDB Storage**: Stores track metadata and raw audio Blobs (`audio_blobs` store) so local files persist across app restarts and browser sessions without re-picking.
- **Pure JS ID3v2 & ID3v1 Tag Parser**: Decodes `TIT2`, `TPE1`, `TALB`, `USLT` lyrics, and `APIC` embedded album artwork directly from binary ArrayBuffers.
- **Media Session API**: Integrates with Android lock-screen controls, notification drawer media player, and Bluetooth headset buttons.
- **Offline PWA**: Full `manifest.json` and `sw.js` Service Worker for standalone installation on Android devices.

---

## 🚀 Running the App

```bash
# Install dependencies
pnpm install

# Start Vite dev server
pnpm dev

# Or run preview server
pnpm preview --host 0.0.0.0 --port 5173
```
