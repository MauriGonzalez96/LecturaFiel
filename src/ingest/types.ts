export type BookFormat = 'txt' | 'epub' | 'pdf' | 'md' | 'unknown'

export interface BookChapter {
  number: number
  title: string
  text: string
  /** Rango de páginas del PDF original (1-based), si aplica. */
  pageFrom?: number
  pageTo?: number
  /** Capítulo literario detectado (ej. «Capítulo III: …»), si aplica. */
  chapterLabel?: string
  /** Número de capítulo literario correlativo en el libro. */
  literaryChapter?: number
}

/** Resultado del parser, antes de asignar huella de archivo. */
export interface ParsedBook {
  title: string
  sourceName: string
  format: BookFormat
  chapters: BookChapter[]
}

export interface IngestedBook extends ParsedBook {
  /** Identificador estable para progreso (nombre + tamaño + mtime). */
  id: string
  sourceSize?: number
  sourceModified?: number
}
