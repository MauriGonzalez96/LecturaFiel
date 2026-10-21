import type { BookFormat } from '../ingest/types'
import type { GlossaryItem } from '../types/lexicon'

/** Un libro en el archivo de glosario (puede no estar en los slots activos). */
export interface GlossaryBookRecord {
  bookId: string
  title: string
  sourceName: string
  format: BookFormat | 'demo' | 'unknown'
  updatedAt: string
  /** Entradas únicas por lema (se van acumulando al leer). */
  entries: GlossaryItem[]
}

/**
 * Archivo único de glosarios: un objeto por libro.
 * Se puede exportar/importar como JSON.
 */
export interface GlossaryVaultFile {
  version: 1
  app: 'lectura-fiel'
  updatedAt: string
  books: GlossaryBookRecord[]
}

export function emptyVault(): GlossaryVaultFile {
  return {
    version: 1,
    app: 'lectura-fiel',
    updatedAt: new Date().toISOString(),
    books: [],
  }
}
