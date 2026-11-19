/**
 * IndexedDB interno. Se mantiene el id histórico para no perder biblioteca/glosario.
 * La marca visible es Lektor.
 */
export const IDB_NAME = 'lectura-fiel'
/** Subir al agregar stores. Todos los openDb deben usar esta versión. */
export const IDB_VERSION = 3

export const IDB_STORES = {
  library: 'library',
  glossaryVault: 'glossary-vault',
  chapterSummaries: 'chapter-summaries',
} as const

export function openLecturaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB no disponible'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORES.library)) {
        db.createObjectStore(IDB_STORES.library)
      }
      if (!db.objectStoreNames.contains(IDB_STORES.glossaryVault)) {
        db.createObjectStore(IDB_STORES.glossaryVault)
      }
      if (!db.objectStoreNames.contains(IDB_STORES.chapterSummaries)) {
        db.createObjectStore(IDB_STORES.chapterSummaries)
      }
    }
  })
}
