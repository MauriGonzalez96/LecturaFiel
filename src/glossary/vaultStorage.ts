import type { GlossaryVaultFile } from './types'
import { emptyVault } from './types'

const DB_NAME = 'lectura-fiel'
const DB_VERSION = 2
const STORE = 'glossary-vault'
const KEY = 'vault'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB no disponible'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('library')) {
        db.createObjectStore('library')
      }
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
  })
}

export async function loadVault(): Promise<GlossaryVaultFile> {
  try {
    const db = await openDb()
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(KEY)
      req.onsuccess = () => {
        const value = req.result as GlossaryVaultFile | undefined
        if (value?.version === 1 && Array.isArray(value.books)) {
          resolve(value)
        } else {
          resolve(emptyVault())
        }
      }
      req.onerror = () => reject(req.error)
    })
  } catch {
    return emptyVault()
  }
}

export async function saveVault(vault: GlossaryVaultFile): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(vault, KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('No se pudo guardar el glosario'))
  })
}

export function vaultToJson(vault: GlossaryVaultFile): string {
  return JSON.stringify(vault, null, 2)
}

export function parseVaultJson(raw: string): GlossaryVaultFile {
  const data = JSON.parse(raw) as GlossaryVaultFile
  if (data?.version !== 1 || !Array.isArray(data.books)) {
    throw new Error('JSON de glosario inválido')
  }
  return {
    version: 1,
    app: 'lectura-fiel',
    updatedAt: data.updatedAt || new Date().toISOString(),
    books: data.books,
  }
}
