import { Capacitor } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

declare const __GITHUB_REPO__: string | undefined;
declare const __APP_VERSION__: string | undefined;

export const APP_BASE_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.5';
export const GITHUB_REPO = typeof __GITHUB_REPO__ !== 'undefined' ? __GITHUB_REPO__ : 'Duwebs/raag-player';

// Redundant multi-CDN mirror endpoints for 100% reliable OTA delivery
export const OTA_VERSION_URLS = [
  `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/version.json`,
  `https://raw.githubusercontent.com/${GITHUB_REPO}/main/ota/version.json`,
  `https://fastly.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/version.json`,
];

export const OTA_BUNDLE_URLS = [
  `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/bundle.zip`,
  `https://raw.githubusercontent.com/${GITHUB_REPO}/main/ota/bundle.zip`,
  `https://fastly.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/bundle.zip`,
];

export const OTA_VERSION_URL = OTA_VERSIONS_PRIMARY_URL();
export const OTA_BUNDLE_URL = OTA_BUNDLE_URLS[0];

function OTA_VERSIONS_PRIMARY_URL(): string {
  return OTA_VERSION_URLS[0];
}

export function getMockUpdate(): UpdateCheckResult {
  return {
    updateAvailable: true,
    currentVersion: APP_BASE_VERSION,
    remoteVersion: '1.0.19',
    notes: 'Multi-CDN Live OTA updater test',
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
 * Checks remote version.json for updates across redundant CDN mirrors (jsDelivr + GitHub Raw + Fastly)
 */
export async function checkRemoteUpdate(throwOnError = false): Promise<UpdateCheckResult> {
  const currentVersion = await getActiveBundleVersion();

  if (!navigator.onLine) {
    if (throwOnError) {
      throw new Error('Device is offline. Check your internet connection.');
    }
    return { updateAvailable: false, currentVersion };
  }

  const timestamp = Date.now();
  const candidateUrls = OTA_VERSION_URLS.map((u) => `${u}?t=${timestamp}`);

  let lastErrorDetail = '';
  let fetchedData: RemoteVersionInfo | null = null;
  let workingUrl = '';

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Accept: 'application/json, text/plain, */*',
        },
      });

      if (!res.ok) {
        lastErrorDetail = `HTTP ${res.status} from ${url}`;
        continue;
      }

      const rawText = await res.text();
      const trimmed = rawText.trim();

      // If server returned HTML (e.g. ISP block page, 404 HTML, or Cloudflare challenge), try next mirror
      if (trimmed.startsWith('<') || trimmed.toLowerCase().startsWith('<!doctype')) {
        lastErrorDetail = `Server returned HTML instead of JSON from ${url}`;
        continue;
      }

      const parsed: RemoteVersionInfo = JSON.parse(trimmed);
      if (parsed && parsed.version) {
        fetchedData = parsed;
        workingUrl = url;
        break;
      }
    } catch (err: unknown) {
      lastErrorDetail = (err as Error)?.message || `Fetch error from ${url}`;
    }
  }

  if (!fetchedData) {
    if (throwOnError) {
      throw new Error(lastErrorDetail || 'Failed to fetch update info from all mirrors');
    }
    console.warn('[OTA] Check update failed:', lastErrorDetail);
    return { updateAvailable: false, currentVersion };
  }

  const remoteVer = (fetchedData.version || '').trim();
  const currVer = currentVersion.trim();
  const hasVersionDiff = !!(remoteVer && remoteVer !== currVer);
  const isNewer = hasVersionDiff && isNewerVersion(remoteVer, currVer);

  // Normalize bundleUrl to a working URL
  let rawBundle = fetchedData.bundleUrl || OTA_BUNDLE_URL;
  if (!rawBundle.startsWith('http')) {
    rawBundle = `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/${rawBundle}`;
  }

  return {
    updateAvailable: isNewer || hasVersionDiff,
    currentVersion,
    remoteVersion: remoteVer,
    notes: fetchedData.notes || 'Latest UI & playback improvements',
    bundleUrl: rawBundle,
  };
}

/**
 * Downloads and applies live OTA update with progress callback and automatic mirror fallback
 */
export async function downloadAndApplyUpdate(
  bundleUrl: string,
  version: string,
  onProgress: (percent: number) => void
): Promise<void> {
  const candidateBundles = [
    bundleUrl,
    `https://raw.githubusercontent.com/${GITHUB_REPO}/main/ota/bundle.zip`,
    `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/bundle.zip`,
    `https://fastly.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/bundle.zip`,
  ].filter(Boolean);

  if (Capacitor.isNativePlatform()) {
    let lastDownloadError: Error | null = null;
    let listenerHandle: { remove: () => void } | null = null;

    try {
      listenerHandle = await CapacitorUpdater.addListener('download', (state) => {
        if (state && typeof state.percent === 'number') {
          onProgress(Math.min(100, Math.max(0, state.percent)));
        }
      });
    } catch {
      // ignore
    }

    // Try candidate bundles until one downloads and applies successfully
    for (const targetUrl of candidateBundles) {
      try {
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
        return;
      } catch (err: unknown) {
        lastDownloadError = err as Error;
        console.warn(`[OTA] Download from ${targetUrl} failed, trying next mirror:`, err);
      }
    }

    if (listenerHandle) {
      listenerHandle.remove();
    }
    const msg = lastDownloadError?.message || 'Failed to download update bundle from all mirrors.';
    throw new Error(msg);
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
