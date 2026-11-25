import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

declare const __GITHUB_REPO__: string | undefined;
declare const __APP_VERSION__: string | undefined;

export const APP_BASE_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.5';
export const GITHUB_REPO = typeof __GITHUB_REPO__ !== 'undefined' ? __GITHUB_REPO__ : 'Duwebs/raag-player';

// jsDelivr CDN endpoints with raw.githubusercontent.com fallback
export const JSDELIVR_OTA_VERSION_URL = `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/version.json`;
export const GITHUB_RAW_OTA_VERSION_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/ota/version.json`;
export const OTA_VERSION_URL = JSDELIVR_OTA_VERSION_URL;
export const OTA_BUNDLE_URL = `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/bundle.zip`;

export function getMockUpdate(): UpdateCheckResult {
  return {
    updateAvailable: true,
    currentVersion: APP_BASE_VERSION,
    remoteVersion: '1.0.17',
    notes: 'jsDelivr CDN Live OTA updater test',
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
 * Checks remote version.json for updates via jsDelivr CDN (with GitHub Raw fallback)
 */
export async function checkRemoteUpdate(throwOnError = false): Promise<UpdateCheckResult> {
  const currentVersion = await getActiveBundleVersion();

  if (!navigator.onLine) {
    if (throwOnError) {
      throw new Error('Device is offline. Check your internet connection.');
    }
    return { updateAvailable: false, currentVersion };
  }

  const jsdelivrUrl = `${JSDELIVR_OTA_VERSION_URL}?t=${Date.now()}`;
  const rawUrl = `${GITHUB_RAW_OTA_VERSION_URL}?t=${Date.now()}`;

  let res: Response | null = null;
  let activeUrl = jsdelivrUrl;

  try {
    res = await fetch(jsdelivrUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
  } catch (err) {
    console.warn('[OTA] jsDelivr fetch failed, falling back to GitHub raw:', err);
  }

  // Fallback to raw.githubusercontent.com if jsdelivr fails or returns non-200
  if (!res || !res.ok) {
    activeUrl = rawUrl;
    try {
      res = await fetch(rawUrl, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });
    } catch (err) {
      console.warn('[OTA] GitHub raw fetch failed:', err);
    }
  }

  if (!res || !res.ok) {
    const status = res ? `HTTP ${res.status}` : 'offline';
    const err = new Error(`${status} from ${activeUrl}`);
    if (throwOnError) throw err;
    console.warn(`[OTA] ${err.message}`);
    return { updateAvailable: false, currentVersion };
  }

  const rawText = await res.text();
  const trimmed = rawText.trim();

  // Check if response is HTML
  if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
    const err = new Error(`Server returned HTML instead of JSON from ${activeUrl}`);
    if (throwOnError) throw err;
    console.warn(`[OTA] ${err.message}`);
    return { updateAvailable: false, currentVersion };
  }

  let data: RemoteVersionInfo;
  try {
    data = JSON.parse(trimmed);
  } catch (parseErr: unknown) {
    const err = new Error(`Invalid JSON from ${activeUrl}: ${(parseErr as Error)?.message || 'parse error'}`);
    if (throwOnError) throw err;
    console.warn(`[OTA] ${err.message}`);
    return { updateAvailable: false, currentVersion };
  }

  const remoteVer = (data.version || '').trim();
  const currVer = currentVersion.trim();
  const hasVersionDiff = !!(remoteVer && remoteVer !== currVer);
  const isNewer = hasVersionDiff && isNewerVersion(remoteVer, currVer);

  // Normalize bundleUrl to jsDelivr CDN
  let rawBundle = data.bundleUrl || OTA_BUNDLE_URL;
  if (!rawBundle.startsWith('http')) {
    rawBundle = `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/${rawBundle}`;
  }

  return {
    updateAvailable: isNewer || hasVersionDiff,
    currentVersion,
    remoteVersion: remoteVer,
    notes: data.notes || 'Latest UI & playback improvements',
    bundleUrl: rawBundle,
  };
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
    targetUrl = `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/${targetUrl}`;
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
