import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

export const APP_BASE_VERSION = '1.0.0';
export const OTA_VERSION_URL = 'https://raag-player.vercel.app/version.json';

export function getMockUpdate(): UpdateCheckResult {
  return {
    updateAvailable: true,
    currentVersion: '1.0.0',
    remoteVersion: '1.0.1',
    notes: 'v1.0.1: Native Android MediaStore audio scanner, real OS permissions & Over-The-Air updater',
    bundleUrl: 'https://raag-player.vercel.app/bundle.zip',
  };
}

export interface RemoteVersionInfo {
  version: string;
  buildTime: string;
  notes: string;
  bundleUrl: string;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  remoteVersion?: string;
  notes?: string;
  bundleUrl?: string;
}

export function isNewerVersion(remote: string, current: string): boolean {
  const rParts = remote.replace(/^v/, '').split('.').map((p) => parseInt(p, 10) || 0);
  const cParts = current.replace(/^v/, '').split('.').map((p) => parseInt(p, 10) || 0);
  const len = Math.max(rParts.length, cParts.length);

  for (let i = 0; i < len; i++) {
    const r = rParts[i] || 0;
    const c = cParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

/**
 * Notifies Capacitor that the current bundle loaded successfully and prevents rollback
 */
export async function notifyAppReady(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await CapacitorUpdater.notifyAppReady();
      console.log('[OTA] CapacitorUpdater notifyAppReady confirmed.');
    } catch (err) {
      console.warn('[OTA] notifyAppReady warning:', err);
    }
  }
}

/**
 * Retrieves currently active bundle version
 */
export async function getActiveBundleVersion(): Promise<string> {
  const stored = localStorage.getItem('raag_active_bundle_version');
  if (stored) return stored;

  if (Capacitor.isNativePlatform()) {
    try {
      const current = await CapacitorUpdater.current();
      if (current && current.bundle && current.bundle.version) {
        return current.bundle.version;
      }
    } catch {
      // fallback
    }
  }

  return APP_BASE_VERSION;
}

/**
 * Checks remote version.json for updates
 */
export async function checkRemoteUpdate(): Promise<UpdateCheckResult> {
  const currentVersion = await getActiveBundleVersion();

  try {
    const res = await fetch(`${OTA_VERSION_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });

    if (!res.ok) {
      return { updateAvailable: false, currentVersion };
    }

    const data: RemoteVersionInfo = await res.json();
    const isNewer = isNewerVersion(data.version, currentVersion);

    return {
      updateAvailable: isNewer,
      currentVersion,
      remoteVersion: data.version,
      notes: data.notes || 'Latest UI & playback improvements',
      bundleUrl: data.bundleUrl || 'https://raag-player.vercel.app/bundle.zip',
    };
  } catch (err) {
    console.warn('[OTA] Check update network error:', err);
    return { updateAvailable: false, currentVersion };
  }
}

/**
 * Downloads and applies live OTA update with progress callback
 */
export async function downloadAndApplyUpdate(
  bundleUrl: string,
  version: string,
  onProgress: (percent: number) => void
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    let listenerHandle: { remove: () => void } | null = null;

    try {
      listenerHandle = await CapacitorUpdater.addListener('download', (state) => {
        if (state && typeof state.percent === 'number') {
          onProgress(Math.min(100, Math.max(0, state.percent)));
        }
      });

      onProgress(10);
      const bundle = await CapacitorUpdater.download({
        url: bundleUrl,
        version: version,
      });

      onProgress(95);
      if (listenerHandle) {
        listenerHandle.remove();
        listenerHandle = null;
      }

      // Save locally
      localStorage.setItem('raag_active_bundle_version', version);
      localStorage.setItem('raag_just_updated_version', version);

      // Set bundle and reload into the new web bundle
      await CapacitorUpdater.set({ id: bundle.id });
      onProgress(100);
      await CapacitorUpdater.reload();
    } catch (err) {
      if (listenerHandle) {
        listenerHandle.remove();
      }
      console.error('[OTA] Download or apply failed:', err);
      throw err;
    }
  } else {
    // Web simulation
    for (let p = 10; p <= 100; p += 20) {
      onProgress(p);
      await new Promise((r) => setTimeout(r, 200));
    }
    localStorage.setItem('raag_active_bundle_version', version);
    localStorage.setItem('raag_just_updated_version', version);
    window.location.reload();
  }
}
