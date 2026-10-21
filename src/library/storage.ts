import type { LibraryState } from './types'

const DB_NAME = 'lectura-fiel'
const DB_VERSION = 2
const STORE = 'library'
const KEY = 'state'

/** Aviso práctico: ~4–5 MB de JSON suele rozar cuotas en algunos perfiles. */
export const LIBRARY_WARN_BYTES = 4_500_000

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB no disponible'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
      if (!db.objectStoreNames.contains('glossary-vault')) {
        db.createObjectStore('glossary-vault')
      }
    }
  })
}

export async function loadLibraryState(): Promise<LibraryState | null> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(KEY)
      req.onsuccess = () => {
        const value = req.result as LibraryState | undefined
        if (!value || value.version !== 1) {
          resolve(null)
          return
        }
        // Migración suave: slots viejos sin sentenceIndex
        resolve({
          ...value,
          slots: value.slots.map((s) => ({
            ...s,
            sentenceIndex: typeof s.sentenceIndex === 'number' ? s.sentenceIndex : 0,
          })),
        })
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export function estimateLibraryBytes(state: LibraryState): number {
  try {
    return new Blob([JSON.stringify(state)]).size
  } catch {
    return JSON.stringify(state).length * 2
  }
}

export async function saveLibraryState(state: LibraryState): Promise<void> {
  const bytes = estimateLibraryBytes(state)
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(state, KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('No se pudo guardar la biblioteca'))
      tx.onabort = () =>
        reject(tx.error ?? new Error('Guardado de biblioteca cancelado (¿cuota llena?)'))
    })
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : 'No se pudo guardar la biblioteca'
    if (bytes > LIBRARY_WARN_BYTES || /quota|espacio|full/i.test(msg)) {
      throw new Error(
        `No hay espacio suficiente para guardar la biblioteca (~${Math.round(bytes / 1e6)} MB). Quitá un libro e intentá de nuevo.`,
      )
    }
    throw new Error(msg)
  }
}

export function emptyLibraryState(): LibraryState {
  return { version: 1, slots: [], activeBookId: null }
}
