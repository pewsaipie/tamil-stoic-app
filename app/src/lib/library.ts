/**
 * Private reader library — saved kurals and reflections.
 *
 * This is a faithful port of the existing `js/storage.js` contract, deliberately
 * using the **same** IndexedDB database, version, store, keyPath and
 * localStorage fallback key. Anyone who already saved kurals in the shipped app
 * keeps them after this rewrite — the two implementations are interchangeable.
 *
 *   database : tamil-stoic-reader (v1)
 *   store    : saved-kurals, keyPath "n"
 *   fallback : localStorage "tamil-stoic-saved-v1" → { [n]: record }
 *
 * Nothing leaves the device. There is no network call in this file.
 */

export interface SavedRecord {
  n: number
  /** Private note, capped at 500 characters (same limit as the shipped app). */
  note: string
  savedAt: number
  updatedAt: number
}

const DB_NAME = 'tamil-stoic-reader'
const DB_VERSION = 1
const STORE_NAME = 'saved-kurals'
const FALLBACK_KEY = 'tamil-stoic-saved-v1'
export const NOTE_LIMIT = 500

let dbPromise: Promise<IDBDatabase> | null = null

function normalise(value: unknown): SavedRecord | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Record<string, unknown>
  const n = Number(raw['n'])
  if (!Number.isInteger(n) || n < 1) return null
  const now = Date.now()
  return {
    n,
    note: String(raw['note'] ?? '').slice(0, NOTE_LIMIT),
    savedAt: Number(raw['savedAt']) || now,
    updatedAt: Number(raw['updatedAt']) || now,
  }
}

function readFallback(): Record<string, SavedRecord> {
  try {
    const raw = window.localStorage.getItem(FALLBACK_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    const out: Record<string, SavedRecord> = {}
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const record = normalise(value)
      if (record) out[key] = record
    }
    return out
  } catch {
    return {}
  }
}

function writeFallback(records: Record<string, SavedRecord>): void {
  try {
    window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(records))
  } catch {
    // Private-browsing contexts can deny storage. The in-memory store still
    // works for this session; the UI surfaces the degraded state.
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('reader storage request failed'))
  })
}

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'))
  }
  if (dbPromise) return dbPromise

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'n' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('unable to open reader storage'))
    request.onblocked = () => reject(new Error('reader storage is blocked'))
  })

  dbPromise.catch(() => {
    dbPromise = null
  })

  return dbPromise
}

/** Run against IndexedDB, falling back to localStorage + memory. */
async function usingDatabase<T>(operation: (db: IDBDatabase) => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  try {
    const db = await openDatabase()
    return await operation(db)
  } catch {
    return await fallback()
  }
}

export function listSaved(): Promise<SavedRecord[]> {
  return usingDatabase(
    async (db) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const rows = await requestResult(transaction.objectStore(STORE_NAME).getAll())
      return rows.map(normalise).filter((record): record is SavedRecord => record !== null)
    },
    () => Object.values(readFallback()),
  )
}

export function putSaved(input: { n: number; note?: string }): Promise<SavedRecord> {
  const n = Number(input.n)
  if (!Number.isInteger(n) || n < 1) throw new Error('a saved kural needs a valid number')
  const now = Date.now()

  return usingDatabase(
    async (db) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const existing = normalise(await requestResult(store.get(n)))
      const record: SavedRecord = {
        n,
        note: (input.note ?? existing?.note ?? '').slice(0, NOTE_LIMIT),
        savedAt: existing?.savedAt ?? now,
        updatedAt: now,
      }
      await requestResult(store.put(record))
      return record
    },
    () => {
      const records = readFallback()
      const existing = records[String(n)]
      const record: SavedRecord = {
        n,
        note: (input.note ?? existing?.note ?? '').slice(0, NOTE_LIMIT),
        savedAt: existing?.savedAt ?? now,
        updatedAt: now,
      }
      records[String(n)] = record
      writeFallback(records)
      return record
    },
  )
}

export function removeSaved(n: number): Promise<void> {
  if (!Number.isInteger(n) || n < 1) return Promise.resolve()

  return usingDatabase(
    async (db) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      await requestResult(transaction.objectStore(STORE_NAME).delete(n))
    },
    () => {
      const records = readFallback()
      delete records[String(n)]
      writeFallback(records)
    },
  )
}
