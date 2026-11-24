import { Track, Playlist, UserSettings } from '../types';

const DB_NAME = 'raag_player_offline_db';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('tracks')) {
        db.createObjectStore('tracks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('audio_blobs')) {
        db.createObjectStore('audio_blobs');
      }
      if (!db.objectStoreNames.contains('playlists')) {
        db.createObjectStore('playlists', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbSaveTrack(track: Track, audioBlob?: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['tracks', 'audio_blobs'], 'readwrite');
    tx.objectStore('tracks').put(track);
    if (audioBlob) {
      tx.objectStore('audio_blobs').put(audioBlob, track.id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbSaveMultipleTracks(tracks: Track[], blobsMap?: Map<string, Blob>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['tracks', 'audio_blobs'], 'readwrite');
    const trackStore = tx.objectStore('tracks');
    const blobStore = tx.objectStore('audio_blobs');

    for (const track of tracks) {
      trackStore.put(track);
      if (blobsMap && blobsMap.has(track.id)) {
        blobStore.put(blobsMap.get(track.id)!, track.id);
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbGetAllTracks(): Promise<Track[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readonly');
    const request = tx.objectStore('tracks').getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function dbGetAudioBlob(trackId: string): Promise<Blob | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('audio_blobs', 'readonly');
    const request = tx.objectStore('audio_blobs').get(trackId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbDeleteTrack(trackId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['tracks', 'audio_blobs'], 'readwrite');
    tx.objectStore('tracks').delete(trackId);
    tx.objectStore('audio_blobs').delete(trackId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbToggleFavorite(trackId: string): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    const req = store.get(trackId);

    req.onsuccess = () => {
      const track: Track = req.result;
      if (!track) {
        resolve(false);
        return;
      }
      track.isFavorite = !track.isFavorite;
      store.put(track);
      tx.oncomplete = () => resolve(track.isFavorite);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function dbSaveSettings(settings: Partial<UserSettings>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const getReq = store.get('user_settings');

    getReq.onsuccess = () => {
      const current = getReq.result || {};
      const updated = { ...current, ...settings };
      store.put(updated, 'user_settings');
      tx.oncomplete = () => resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function dbGetSettings(): Promise<Partial<UserSettings> | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const req = tx.objectStore('settings').get('user_settings');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function dbSavePlaylists(playlists: Playlist[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readwrite');
    const store = tx.objectStore('playlists');
    store.clear();
    for (const p of playlists) {
      store.put(p);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function dbGetPlaylists(): Promise<Playlist[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('playlists', 'readonly');
    const req = tx.objectStore('playlists').getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function dbClearStorage(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['tracks', 'audio_blobs', 'playlists'], 'readwrite');
    tx.objectStore('tracks').clear();
    tx.objectStore('audio_blobs').clear();
    tx.objectStore('playlists').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
