import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

declare const __GITHUB_REPO__: string | undefined;
declare const __APP_VERSION__: string | undefined;

export const APP_BASE_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.5';
export const GITHUB_REPO = typeof __GITHUB_REPO__ !== 'undefined' ? __GITHUB_REPO__ : 'Duwebs/raag-player';

// Redundant multi-CDN mirror endpoints for 100% reliable OTA delivery (raw GitHub first)
export const OTA_VERSION_URLS = [
  `https://raw.githubusercontent.com/${GITHUB_REPO}/main/ota/version.json`,
  `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/version.json`,
  `https://fastly.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/version.json`,
];

export const OTA_BUNDLE_URLS = [
  `https://raw.githubusercontent.com/${GITHUB_REPO}/main/ota/bundle.zip`,
  `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/bundle.zip`,
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
  checksum?: string;
}

export interface UpdateCheckResult {
  updateAvailable: boolean;
  currentVersion: string;
  remoteVersion?: string;
  notes?: string;
  bundleUrl?: string;
  checksum?: string;
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
  if (Capacitor.isNativePlatform()) {
    try {
      const current = await CapacitorUpdater.current();
      const bundle = current?.bundle;
      if (bundle) {
        if (bundle.id && bundle.id !== 'builtin' && bundle.version && bundle.version !== 'unknown') {
          localStorage.setItem('raag_active_bundle_version', bundle.version);
          return bundle.version;
        }
        if (bundle.id === 'builtin') {
          // Clear any stale OTA version if the app rolled back or reinstalled natively
          localStorage.removeItem('raag_active_bundle_version');
          return APP_BASE_VERSION;
        }
      }
    } catch {
      // fallback below
    }
  }

  const stored = localStorage.getItem('raag_active_bundle_version');
  if (stored) return stored;

  return APP_BASE_VERSION;
}

function withCacheBuster(url: string, timestamp: number): string {
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}t=${timestamp}`;
}

async function computeRemoteSha256(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching bundle for checksum`);
  }
  const buffer = await res.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Checks remote version.json for updates across redundant mirrors (GitHub Raw + jsDelivr + Fastly)
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
      // 1. Try native CapacitorHttp on native device (bypasses browser CORS & WebView restrictions completely)
      if (Capacitor.isNativePlatform()) {
        try {
          const nativeRes = await CapacitorHttp.get({
            url,
            connectTimeout: 8000,
            readTimeout: 8000,
          });

          if (nativeRes.status >= 200 && nativeRes.status < 300) {
            const data = nativeRes.data;
            if (typeof data === 'object' && data !== null && (data as RemoteVersionInfo).version) {
              fetchedData = data as RemoteVersionInfo;
              workingUrl = url;
              break;
            }
            if (typeof data === 'string') {
              const trimmed = data.trim();
              if (!trimmed.startsWith('<') && !trimmed.toLowerCase().startsWith('<!doctype')) {
                const parsed = JSON.parse(trimmed);
                if (parsed && parsed.version) {
                  fetchedData = parsed;
                  workingUrl = url;
                  break;
                }
              }
            }
          }
        } catch (nativeErr) {
          console.warn(`[OTA] Native HTTP request failed for ${url}:`, nativeErr);
        }
      }

      // 2. Simple GET fetch fallback (NO custom headers like Cache-Control/Pragma,
      // which would trigger an OPTIONS preflight request that GitHub Raw blocks with 403 HTML)
      if (!fetchedData) {
        const res = await fetch(url);
        if (!res.ok) {
          lastErrorDetail = `HTTP ${res.status} from ${url}`;
          continue;
        }

        const rawText = await res.text();
        const trimmed = rawText.trim();

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
  const effectiveCurr = !currVer || currVer === 'builtin' || currVer === 'unknown' ? '0.0.0' : currVer;
  const isNewer = Boolean(remoteVer && isNewerVersion(remoteVer, effectiveCurr));

  // Normalize bundleUrl to a working URL
  let rawBundle = fetchedData.bundleUrl || OTA_BUNDLE_URL;
  if (!rawBundle.startsWith('http')) {
    rawBundle = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/ota/${rawBundle}`;
  }

  return {
    updateAvailable: isNewer,
    currentVersion,
    remoteVersion: remoteVer,
    notes: fetchedData.notes || 'Latest UI & playback improvements',
    bundleUrl: rawBundle,
    checksum: fetchedData.checksum?.trim().toLowerCase() || undefined,
  };
}

/**
 * Downloads and applies live OTA update with progress callback and automatic mirror fallback
 */
export async function downloadAndApplyUpdate(
  bundleUrl: string,
  version: string,
  onProgress: (percent: number) => void,
  checksum?: string
): Promise<void> {
  const timestamp = Date.now();
  const orderedBases = Array.from(
    new Set(
      [
        bundleUrl && !bundleUrl.includes('jsdelivr.net') ? bundleUrl : '',
        `https://raw.githubusercontent.com/${GITHUB_REPO}/main/ota/bundle.zip`,
        bundleUrl || '',
        `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/bundle.zip`,
        `https://fastly.jsdelivr.net/gh/${GITHUB_REPO}@main/ota/bundle.zip`,
      ].filter(Boolean)
    )
  );
  const candidateBundles = orderedBases.map((u) => withCacheBuster(u, timestamp));

  if (Capacitor.isNativePlatform()) {
    let lastErrorMessage = '';
    let nativeFailReason = '';
    let progressHandle: { remove: () => Promise<void> | void } | null = null;
    let failHandle: { remove: () => Promise<void> | void } | null = null;

    try {
      progressHandle = await CapacitorUpdater.addListener('download', (state) => {
        if (state && typeof state.percent === 'number') {
          onProgress(Math.min(95, Math.max(0, state.percent)));
        }
      });
      failHandle = await CapacitorUpdater.addListener('downloadFailed', (state: { version?: string; error?: string }) => {
        if (state?.error) {
          nativeFailReason = state.error;
        }
      });
    } catch {
      // ignore listener registration failure
    }

    const baseChecksum = (checksum || '').trim().toLowerCase();

    try {
      // Try candidate bundles until one downloads, verifies SHA-256 checksum, and applies
      for (const targetUrl of candidateBundles) {
        nativeFailReason = '';
        try {
          onProgress(10);
          let resolvedChecksum = baseChecksum;
          if (!resolvedChecksum) {
            resolvedChecksum = await computeRemoteSha256(targetUrl);
          }

          const bundle = await CapacitorUpdater.download({
            url: targetUrl,
            version,
            checksum: resolvedChecksum,
          });

          if (!bundle || !bundle.id) {
            throw new Error('Downloaded bundle metadata is missing');
          }

          onProgress(95);

          // Persist updated version before terminal WebView reload inside set()
          localStorage.setItem('raag_active_bundle_version', version);
          localStorage.setItem('raag_just_updated_version', version);

          onProgress(100);
          // CapacitorUpdater.set() activates the bundle and triggers native _reload()
          await CapacitorUpdater.set({ id: bundle.id });
          return;
        } catch (err: unknown) {
          const e = err as { message?: string; code?: string; errorMessage?: string };
          const detail = nativeFailReason || e?.errorMessage || e?.code || '';
          const msg = e?.message || `Failed to download from ${targetUrl}`;
          lastErrorMessage = detail && !msg.includes(detail) ? `${msg} (${detail})` : msg;
          console.warn(`[OTA] Download from ${targetUrl} failed, trying next mirror:`, err);
        }
      }
    } finally {
      if (progressHandle) {
        await progressHandle.remove();
      }
      if (failHandle) {
        await failHandle.remove();
      }
    }

    throw new Error(lastErrorMessage || 'Failed to download update bundle from all mirrors.');
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
