/**
 * IndexedDB wrapper for storing audio files
 * This avoids localStorage quota issues with large audio data URLs
 */

const DB_NAME = 'CallCenterAudioDB';
const STORE_NAME = 'audioFiles';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });

  return dbPromise;
}

/**
 * Store audio file in IndexedDB
 */
export async function storeAudioFile(callId: string, file: File | Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(file, callId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve audio file from IndexedDB
 */
export async function getAudioFile(callId: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(callId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete audio file from IndexedDB
 */
export async function deleteAudioFile(callId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(callId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all audio files from IndexedDB
 */
export async function clearAllAudioFiles(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store audio files for multiple calls
 */
export async function storeAudioFiles(calls: Array<{ id: string; audioFile?: File | Blob }>): Promise<void> {
  const promises = calls
    .filter(call => call.audioFile)
    .map(call => storeAudioFile(call.id, call.audioFile!));
  
  await Promise.all(promises);
}

/**
 * Restore audio files for multiple calls
 */
export async function restoreAudioFiles(calls: Array<{ id: string }>): Promise<Map<string, Blob>> {
  const promises = calls.map(async (call) => {
    const blob = await getAudioFile(call.id);
    return { id: call.id, blob };
  });

  const results = await Promise.all(promises);
  const map = new Map<string, Blob>();
  
  results.forEach(({ id, blob }) => {
    if (blob) map.set(id, blob);
  });

  return map;
}
