import type { IngestedBook, ParsedBook, SplitConfidence } from './types'
import { assessSplitConfidence } from './splitConfidence'

/**
 * ¿Conviene ofrecer / priorizar partición con IA?
 * Heurística débil, un solo capítulo, o PDF en bloques de páginas.
 */
export function needsAiSplit(
  book: Pick<ParsedBook, 'format' | 'chapters' | 'splitConfidence'>,
): boolean {
  const confidence: SplitConfidence =
    book.splitConfidence ??
    assessSplitConfidence({
      format: book.format,
      chapters: book.chapters,
      usedPageChunks:
        book.format === 'pdf' &&
        book.chapters.length > 1 &&
        book.chapters.every((c) => !(c.literaryChapter && c.literaryChapter > 0)),
    })

  if (confidence === 'low') return true
  if (book.chapters.length <= 1) return true
  return false
}

export function canOfferAiSplit(book: IngestedBook | null | undefined): boolean {
  return Boolean(book && book.chapters.some((c) => c.text.trim().length > 80))
}
