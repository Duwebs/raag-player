import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

declare const __GITHUB_REPO__: string | undefined;
declare const __APP_VERSION__: string | undefined;

export const APP_BASE_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.5';
export const GITHUB_REPO = typeof __GITHUB_REPO__ !== 'undefined' ? __GITHUB_REPO__ : 'Duwebs/raag-player';

// Direct GitHub Releases asset endpoints
export const OTA_VERSION_URL = `https://github.com/${GITHUB_REPO}/releases/latest/download/version.json`;
export const OTA_FALLBACK_VERSION_URL = `https://github.com/${GITHUB_REPO}/releases/download/ota-latest/version.json`;
export const OTA_BUNDLE_URL = `https://github.com/${GITHUB_REPO}/releases/download/ota-latest/bundle.zip`;

export function getMockUpdate(): UpdateCheckResult {
  return {
    updateAvailable: true,
    currentVersion: APP_BASE_VERSION,
    remoteVersion: '1.0.6',
    notes: 'GitHub Releases Live OTA updater test',
    bundleUrl: OTA_BUNDLE_URL,
  };
}

export interface RemoteVersionInfo {
  version: string;
  buildTime?: string;
  notes?: string;
  bundleUrl?: string;
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
 * Checks remote GitHub Releases version.json for updates
 */
export async function checkRemoteUpdate(throwOnError = false): Promise<UpdateCheckResult> {
  const currentVersion = await getActiveBundleVersion();

  if (!navigator.onLine) {
    if (throwOnError) {
      throw new Error('Device is offline. Check your internet connection.');
    }
    return { updateAvailable: false, currentVersion };
  }

  const fetchHeaders = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Accept: 'application/json, application/octet-stream, */*',
  };

  let res: Response | null = null;

  try {
    // 1. Try latest release download
    try {
      res = await fetch(`${OTA_VERSION_URL}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: fetchHeaders,
      });
    } catch (e) {
      console.warn('[OTA] Primary fetch failed, trying tag URL:', e);
    }

    // 2. Fallback to ota-latest tag if primary was not ok
    if (!res || !res.ok) {
      try {
        res = await fetch(`${OTA_FALLBACK_VERSION_URL}?t=${Date.now()}`, {
          cache: 'no-store',
          headers: fetchHeaders,
        });
      } catch (e) {
        console.warn('[OTA] Fallback fetch failed:', e);
      }
    }

    if (!res || !res.ok) {
      const status = res ? `HTTP ${res.status}` : 'offline';
      const err = new Error(`Update server error (${status})`);
      if (throwOnError) throw err;
      console.warn(`[OTA] ${err.message}`);
      return { updateAvailable: false, currentVersion };
    }

    const text = await res.text();
    const trimmed = text.trim();

    // Prevent SPA rewrite or GitHub 404 HTML from causing Unexpected token '<'
    if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
      const err = new Error('Server returned HTML instead of version.json (Make sure repo releases are public)');
      if (throwOnError) throw err;
      console.warn(`[OTA] ${err.message}`);
      return { updateAvailable: false, currentVersion };
    }

    let data: RemoteVersionInfo;
    try {
      data = JSON.parse(trimmed);
    } catch {
      const err = new Error('Invalid JSON received from update server');
      if (throwOnError) throw err;
      return { updateAvailable: false, currentVersion };
    }

    const remoteVer = (data.version || '').trim();
    const currVer = currentVersion.trim();
    const hasVersionDiff = !!(remoteVer && remoteVer !== currVer);
    const isNewer = hasVersionDiff && isNewerVersion(remoteVer, currVer);

    // Sanitize bundleUrl to point to GitHub Releases
    let rawBundle = data.bundleUrl || OTA_BUNDLE_URL;
    if (!rawBundle.startsWith('http')) {
      rawBundle = `https://github.com/${GITHUB_REPO}/releases/download/ota-latest/${rawBundle}`;
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
  let targetUrl = bundleUrl || OTA_BUNDLE_URL;
  if (!targetUrl.startsWith('http')) {
    targetUrl = `https://github.com/${GITHUB_REPO}/releases/download/ota-latest/${targetUrl}`;
  }

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
