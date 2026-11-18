import { IDB_STORES, openLecturaDb } from '../data/idb'
import type { LibraryState } from './types'

const STORE = IDB_STORES.library
const KEY = 'state'

/** Aviso práctico: ~4–5 MB de JSON suele rozar cuotas en algunos perfiles. */
export const LIBRARY_WARN_BYTES = 4_500_000

export async function loadLibraryState(): Promise<LibraryState | null> {
  try {
    const db = await openLecturaDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(KEY)
      req.onsuccess = () => {
        const value = req.result as LibraryState | undefined
        if (!value || value.version !== 1) {
          resolve(null)
          return
        }
        resolve({
          ...value,
          slots: value.slots.map((s) => ({
            ...s,
            sentenceIndex:
              typeof s.sentenceIndex === 'number' ? s.sentenceIndex : 0,
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
  const db = await openLecturaDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(state, KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () =>
        reject(tx.error ?? new Error('No se pudo guardar la biblioteca'))
      tx.onabort = () =>
        reject(
          tx.error ??
            new Error('Guardado de biblioteca cancelado (¿cuota llena?)'),
        )
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
