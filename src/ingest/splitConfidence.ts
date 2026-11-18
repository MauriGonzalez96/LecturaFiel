import type { BookChapter, BookFormat, SplitConfidence } from './types'

export function assessSplitConfidence(opts: {
  format: BookFormat
  chapters: BookChapter[]
  /** PDF agrupado solo por bloques de páginas (sin encabezados). */
  usedPageChunks?: boolean
  /** Cómo se partió texto plano / markdown. */
  textSplitKind?: 'none' | 'classic' | 'weak'
}): SplitConfidence {
  const n = opts.chapters.length
  if (n <= 1) return 'low'

  if (opts.usedPageChunks) return 'low'

  if (opts.textSplitKind === 'classic') return 'high'
  if (opts.textSplitKind === 'weak') return n >= 3 ? 'medium' : 'low'
  if (opts.textSplitKind === 'none') return 'low'

  const literary = opts.chapters.filter(
    (c) => (c.literaryChapter ?? 0) > 0,
  ).length
  if (literary >= 2) return 'high'

  if (opts.format === 'epub' && n >= 4) return 'medium'
  if (opts.format === 'epub' && n >= 2) return 'medium'

  if (n >= 4) return 'medium'
  return 'medium'
}

export function splitConfidenceLabel(c: SplitConfidence): string {
  switch (c) {
    case 'high':
      return 'Partición clara'
    case 'medium':
      return 'Partición aceptable'
    case 'low':
      return 'Partición débil'
  }
}

export function splitConfidenceHint(
  c: SplitConfidence,
  format: BookFormat,
): string | null {
  if (c !== 'low') return null
  if (format === 'pdf') {
    return 'No se detectaron encabezados de capítulo claros: el PDF quedó en bloques de páginas. Los resúmenes pueden mezclar secciones.'
  }
  if (format === 'txt' || format === 'md') {
    return 'Casi no hay encabezados de capítulo en el archivo: quedó una sola sección (o muy pocas).'
  }
  if (format === 'epub') {
    return 'El EPUB tiene pocas secciones en el índice interno; la partición puede no coincidir con los capítulos del libro.'
  }
  return 'La partición del libro es incierta; revisá los cortes antes de resumir todo.'
}
