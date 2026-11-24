# 🎵 Raag Player — Hybrid Offline Music Player (PWA & Native Android APK)

A sleek, native-Android styled offline music player Progressive Web App & Native Android APK inspired by **Lark Player**. Built with **React 18, Vite, Tailwind CSS, Lucide Icons, Capacitor Android, IndexedDB persistent storage, and the Web Audio API**.

---

## 🦚 Key Features

### 1. Peacock Mascot & Lark-Inspired Matte Black UI
- **Custom Peacock Mascot (`<PeacockMascot />`)**: Royal blue & rich teal plumage, three peacock feather crests (**Kalgi**), golden beak, and pink/coral over-ear audio headphones.
- **Deep Matte-Black Aesthetic**: `#050505` background, `#121214` elevated cards, subtle `1px` borders (`#1E1E22`), and electric blue/teal highlights.
- **Dynamic Now Playing Canvas Ambient Background**: Automatically extracts dominant vibrant tones from album cover art to generate an immersive glowing dark gradient.
- **Tilted Album Mosaic Background**: Ambient 3D perspective album cover grid on onboarding screens.

### 2. Dual Platform Audio Flow (Native Android & Web PWA)
- **Native Android APK (Capacitor)**:
  - Permissions in `AndroidManifest.xml`: `READ_MEDIA_AUDIO` (Android 13+), `READ_EXTERNAL_STORAGE` (Android 12 and below), `WAKE_LOCK`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`.
  - Auto-triggers native OS permission dialog upon tapping **"Get started"**.
  - **Auto-Scan Device Audio**: Automatically scans audio folders (`/Music`, `/Download`, `/Audiobooks`, `/Podcasts`) via native filesystem bridge into the local library without manual folder picking.
  - Multi-stage denial handling:
    - **First Deny**: Clean dark screen with golden padlock icon (`🔒`) and **"Allow"** button.
    - **Repeated Deny**: Elevated `#16161A` bottom sheet with custom illustrated banner card and direct link to open Android App Settings if permanently denied.
- **Web / PWA**:
  - `window.showDirectoryPicker()` with multi-file `<input type="file" webkitdirectory multiple accept="audio/*">` fallback.
  - In-app **"Install App"** button via `beforeinstallprompt`.
  - Offline Service Worker (`sw.js`).

### 3. Audio Engineering
- **5-Band Web Audio Hardware Equalizer**: `60Hz`, `230Hz`, `910Hz`, `3.6kHz`, and `14kHz` with presets (*Bass Boost, Classical, Phonk/Bass, Lofi Chill, Flat, Vocal Boost, Electronic*).
- **Chopped & Slowed Tape Pitch Modulation**: Optional pitch reduction preservation toggle for slowed & reverb lo-fi aesthetics.
- **Synced Karaoke Lyrics**: Live-scrolling `.lrc` timestamp sync with tap-to-seek and file import.
- **Media Session API**: Full Android lockscreen, notification controls, and Bluetooth headset integration.

---

## ☁️ Cloud APK Builds via GitHub Actions

The repository includes a complete GitHub Actions CI/CD pipeline at [build-apk.yml](file:///data/user/0/ai.antigem/files/home/raag-player/.github/workflows/build-apk.yml):
1. Automatically triggers on every `push` to `main` (and via manual `workflow_dispatch`).
2. Configures Node.js 20 & Java 17 (Temurin).
3. Builds the Vite web assets and syncs with Capacitor Android.
4. Compiles the native debug APK (`./gradlew assembleDebug`).
5. Uploads the ready-to-install `app-debug.apk` as a downloadable GitHub Actions artifact named **`Raag-Player-APK`**.

---

## 🛠️ Local Development

```bash
# Install dependencies
pnpm install

# Start Vite dev server
pnpm dev

# Build web application & sync native Android project
pnpm build
pnpm exec cap sync android
```
