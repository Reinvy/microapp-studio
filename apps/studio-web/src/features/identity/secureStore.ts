/**
 * Encrypted-at-rest storage for the recovery phrase.
 *
 * The mnemonic is encrypted with a non-extractable AES-GCM `CryptoKey` that
 * lives in IndexedDB. When the browser cannot persist non-extractable keys, the
 * secret stays in memory for the session and `degraded` is reported so the host
 * can demand recovery after reload instead of writing plaintext.
 */

const DB_NAME = 'microapp-identity';
const STORE = 'secret';
const KEY_RECORD = 'key';
const PAYLOAD_RECORD = 'payload';

interface StoredPayload {
  iv: Uint8Array;
  ciphertext: Uint8Array;
}

let memoryFallback: { key: CryptoKey; payload: StoredPayload } | null = null;
let degraded = false;

export function isDegraded(): boolean {
  return degraded;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexedDB open failed'));
  });
}

function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error ?? new Error('indexedDB read failed'));
  });
}

function idbPut(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('indexedDB write failed'));
  });
}

async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function encrypt(key: CryptoKey, plaintext: string): Promise<StoredPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return { iv, ciphertext: new Uint8Array(ciphertext) };
}

async function decrypt(key: CryptoKey, payload: StoredPayload): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: payload.iv as unknown as BufferSource },
    key,
    payload.ciphertext as unknown as BufferSource,
  );
  return new TextDecoder().decode(plaintext);
}

/** Persist the mnemonic encrypted with a non-extractable key. */
export async function saveIdentitySecret(mnemonic: string): Promise<void> {
  try {
    const key = await generateKey();
    const payload = await encrypt(key, mnemonic);
    const db = await openDb();
    try {
      await idbPut(db, KEY_RECORD, key);
      await idbPut(db, PAYLOAD_RECORD, payload);
      // Prove the stored key can decrypt before reporting success.
      const storedKey = await idbGet<CryptoKey>(db, KEY_RECORD);
      const storedPayload = await idbGet<StoredPayload>(db, PAYLOAD_RECORD);
      if (!storedKey || !storedPayload) throw new Error('stored secret unreadable');
      const roundTrip = await decrypt(storedKey, storedPayload);
      if (roundTrip !== mnemonic) throw new Error('stored secret mismatch');
      degraded = false;
      return;
    } finally {
      db.close();
    }
  } catch {
    // Explicit degradation: keep the secret in memory only, never plaintext on disk.
    const key = await generateKey();
    memoryFallback = { key, payload: await encrypt(key, mnemonic) };
    degraded = true;
  }
}

/** Load the mnemonic, or null when the session has no readable secret. */
export async function loadIdentitySecret(): Promise<string | null> {
  if (memoryFallback) {
    return decrypt(memoryFallback.key, memoryFallback.payload);
  }
  try {
    const db = await openDb();
    try {
      const key = await idbGet<CryptoKey>(db, KEY_RECORD);
      const payload = await idbGet<StoredPayload>(db, PAYLOAD_RECORD);
      if (!key || !payload) return null;
      return await decrypt(key, payload);
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

export async function clearIdentitySecret(): Promise<void> {
  memoryFallback = null;
  degraded = false;
  try {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('indexedDB clear failed'));
      });
    } finally {
      db.close();
    }
  } catch {
    // Nothing persisted; nothing to clear.
  }
}
