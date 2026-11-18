import { IDB_STORES, openLecturaDb } from '../data/idb'
import type { ChapterSummary, ProgressSummary } from './types'

const STORE = IDB_STORES.chapterSummaries

function key(bookId: string, chapterIndex: number, hash: string): string {
  return `${bookId}:${chapterIndex}:${hash}`
}

function progressKey(bookId: string, upToIndex: number, hash: string): string {
  return `progress:${bookId}:${upToIndex}:${hash}`
}

export async function loadChapterSummary(
  bookId: string,
  chapterIndex: number,
  hash: string,
): Promise<ChapterSummary | null> {
  try {
    const db = await openLecturaDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(key(bookId, chapterIndex, hash))
      req.onsuccess = () => resolve((req.result as ChapterSummary) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function saveChapterSummary(
  summary: ChapterSummary,
): Promise<void> {
  const db = await openLecturaDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(
      summary,
      key(summary.bookId, summary.chapterIndex, summary.textHash),
    )
    tx.oncomplete = () => resolve()
    tx.onerror = () =>
      reject(tx.error ?? new Error('No se pudo guardar el resumen'))
  })
}

export async function deleteChapterSummary(
  bookId: string,
  chapterIndex: number,
  hash: string,
): Promise<void> {
  const db = await openLecturaDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key(bookId, chapterIndex, hash))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Todos los resúmenes guardados de un libro (cualquier hash de texto). */
export async function listSummariesForBook(
  bookId: string,
): Promise<ChapterSummary[]> {
  try {
    const db = await openLecturaDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).openCursor()
      const out: ChapterSummary[] = []
      const prefix = `${bookId}:`
      req.onsuccess = () => {
        const cursor = req.result
        if (!cursor) {
          resolve(out)
          return
        }
        const k = String(cursor.key)
        // Excluir claves de progreso acumulado.
        if (k.startsWith(prefix) && !k.startsWith('progress:')) {
          const value = cursor.value as ChapterSummary | ProgressSummary
          if (value && !('kind' in value && value.kind === 'progress')) {
            out.push(value as ChapterSummary)
          }
        }
        cursor.continue()
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return []
  }
}

export async function loadProgressSummary(
  bookId: string,
  upToIndex: number,
  hash: string,
): Promise<ProgressSummary | null> {
  try {
    const db = await openLecturaDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(progressKey(bookId, upToIndex, hash))
      req.onsuccess = () =>
        resolve((req.result as ProgressSummary) ?? null)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return null
  }
}

export async function saveProgressSummary(
  summary: ProgressSummary,
): Promise<void> {
  const db = await openLecturaDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(
      summary,
      progressKey(summary.bookId, summary.upToIndex, summary.textHash),
    )
    tx.oncomplete = () => resolve()
    tx.onerror = () =>
      reject(tx.error ?? new Error('No se pudo guardar el progreso'))
  })
}
