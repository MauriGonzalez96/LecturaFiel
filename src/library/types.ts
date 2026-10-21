import type { IngestedBook } from '../ingest/types'

/** Libros abiertos a la vez (progreso + texto). El glosario archivado no tiene este tope. */
export const MAX_LIBRARY_SLOTS = 8

export interface LibrarySlot {
  book: IngestedBook
  /** Índice de capítulo en el que quedó el lector. */
  chapterIndex: number
  /**
   * Oración dentro del capítulo (0 = inicio).
   * Se actualiza con el audio o al marcar progreso en el texto.
   */
  sentenceIndex: number
  /** Timestamp de última lectura / apertura. */
  updatedAt: string
}

export interface LibraryState {
  version: 1
  /** Hasta MAX_LIBRARY_SLOTS slots ocupados. */
  slots: LibrarySlot[]
  /** id del libro activo, o null si estamos en la demo. */
  activeBookId: string | null
}
