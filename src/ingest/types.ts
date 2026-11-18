export type BookFormat = 'txt' | 'epub' | 'pdf' | 'md' | 'unknown'

/** Calidad de la partición en capítulos (heurística, sin IA). */
export type SplitConfidence = 'high' | 'medium' | 'low'

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
  /** Señal de calidad del corte en capítulos. */
  splitConfidence?: SplitConfidence
}

export interface IngestedBook extends ParsedBook {
  /** Identificador estable para progreso (nombre + tamaño + mtime). */
  id: string
  sourceSize?: number
  sourceModified?: number
  /**
   * Copia de la partición original (tras ingestión o primer guardado).
   * Sirve para «Restablecer partición».
   */
  sourceChapters?: BookChapter[]
}
