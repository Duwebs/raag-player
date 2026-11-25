import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

export const APP_BASE_VERSION = '1.0.0';
export const OTA_BASE_URL = 'https://raagplayer.vercel.app';
export const OTA_VERSION_URL = `${OTA_BASE_URL}/version.json`;
export const OTA_BUNDLE_URL = `${OTA_BASE_URL}/bundle.zip`;

export function getMockUpdate(): UpdateCheckResult {
  return {
    updateAvailable: true,
    currentVersion: '1.0.0',
    remoteVersion: '1.0.1',
    notes: 'v1.0.1: Native Android MediaStore audio scanner, real OS permissions & Over-The-Air updater',
    bundleUrl: OTA_BUNDLE_URL,
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
export async function checkRemoteUpdate(throwOnError = false): Promise<UpdateCheckResult> {
  const currentVersion = await getActiveBundleVersion();

  if (!navigator.onLine) {
    if (throwOnError) {
      throw new Error('Device is offline. Check your internet connection.');
    }
    return { updateAvailable: false, currentVersion };
  }

  try {
    const res = await fetch(`${OTA_VERSION_URL}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (!res.ok) {
      const err = new Error(`Server error ${res.status} on version.json`);
      if (throwOnError) throw err;
      console.warn(`[OTA] ${err.message}`);
      return { updateAvailable: false, currentVersion };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const err = new Error('Server returned HTML instead of version.json (SPA rewrite error)');
      if (throwOnError) throw err;
      console.warn(`[OTA] ${err.message}`);
      return { updateAvailable: false, currentVersion };
    }

    const data: RemoteVersionInfo = await res.json();
    const remoteVer = (data.version || '').trim();
    const currVer = currentVersion.trim();
    const hasVersionDiff = !!(remoteVer && remoteVer !== currVer);
    const isNewer = hasVersionDiff && isNewerVersion(remoteVer, currVer);

    // Sanitize bundleUrl to ensure it points to the exact hosted domain
    let rawBundle = data.bundleUrl || OTA_BUNDLE_URL;
    rawBundle = rawBundle.replace('https://raag-player.vercel.app', OTA_BASE_URL);

    // Verify bundle accessibility if online
    try {
      const probeRes = await fetch(rawBundle, { method: 'HEAD', cache: 'no-store' });
      if (!probeRes.ok && probeRes.status === 404) {
        const bundleErr = new Error('bundle.zip not found on update server (HTTP 404)');
        if (throwOnError) throw bundleErr;
      }
    } catch (probeErr: unknown) {
      if (probeErr instanceof Error && probeErr.message.includes('bundle.zip not found')) {
        throw probeErr;
      }
    }

    return {
      updateAvailable: isNewer || hasVersionDiff,
      currentVersion,
      remoteVersion: remoteVer,
      notes: data.notes || 'Latest UI & playback improvements',
      bundleUrl: rawBundle,
    };
  } catch (err: unknown) {
    if (throwOnError) {
      const msg = (err as Error)?.message || 'Network error reaching update server';
      throw new Error(msg);
    }
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
  // Always normalize URL against the live base host
  let targetUrl = bundleUrl || OTA_BUNDLE_URL;
  targetUrl = targetUrl.replace('https://raag-player.vercel.app', OTA_BASE_URL);

  if (Capacitor.isNativePlatform()) {
    let listenerHandle: { remove: () => void } | null = null;

    try {
      // 1. Verify bundle accessibility before handing off to CapacitorUpdater
      try {
        const probeRes = await fetch(targetUrl, {
          method: 'HEAD',
          cache: 'no-store',
        });
        if (!probeRes.ok) {
          throw new Error(`Update bundle not found on server (HTTP ${probeRes.status}).`);
        }
      } catch (probeErr: unknown) {
        if (probeErr instanceof Error && probeErr.message.includes('Update bundle not found')) {
          throw probeErr;
        }
        if (!navigator.onLine) {
          throw new Error('Device is offline. Please check your internet connection.');
        }
        // If HEAD check is restricted by CORS but online, proceed to download
      }

      listenerHandle = await CapacitorUpdater.addListener('download', (state) => {
        if (state && typeof state.percent === 'number') {
          onProgress(Math.min(100, Math.max(0, state.percent)));
        }
      });

      onProgress(10);
      const bundle = await CapacitorUpdater.download({
        url: targetUrl,
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
    } catch (err: unknown) {
      if (listenerHandle) {
        listenerHandle.remove();
      }
      console.error('[OTA] Download or apply failed:', err);
      const msg = (err as Error)?.message || 'Failed to download update bundle.';
      throw new Error(msg);
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
