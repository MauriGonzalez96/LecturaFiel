import { IDB_STORES, openLecturaDb } from '../data/idb'
import type { GlossaryVaultFile } from './types'
import { emptyVault } from './types'

const STORE = IDB_STORES.glossaryVault
const KEY = 'vault'

export async function loadVault(): Promise<GlossaryVaultFile> {
  try {
    const db = await openLecturaDb()
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
  const db = await openLecturaDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(vault, KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () =>
      reject(tx.error ?? new Error('No se pudo guardar el glosario'))
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
