import { useEffect, useMemo, useState } from 'react'
import { textHash } from '../ai/hash'
import { listSummariesForBook } from '../ai/summaryStorage'

/**
 * Índices de capítulo con resumen válido para el texto actual del libro.
 * `refreshTick` fuerza relectura (p. ej. tras generar un resumen).
 */
export function useBookSummaryIndex(
  bookId: string | null,
  chapterTexts: readonly string[],
  refreshTick = 0,
): Set<number> {
  const [ready, setReady] = useState<Set<number>>(() => new Set())
  const fingerprint = useMemo(
    () => chapterTexts.map((t) => textHash(t || '')).join('|'),
    [chapterTexts],
  )

  useEffect(() => {
    if (!bookId || chapterTexts.length === 0) {
      setReady(new Set())
      return
    }

    let cancelled = false
    const hashes = fingerprint.split('|')

    void listSummariesForBook(bookId).then((list) => {
      if (cancelled) return
      const next = new Set<number>()
      for (const s of list) {
        if (
          s.chapterIndex >= 0 &&
          s.chapterIndex < hashes.length &&
          s.textHash === hashes[s.chapterIndex]
        ) {
          next.add(s.chapterIndex)
        }
      }
      setReady(next)
    })

    return () => {
      cancelled = true
    }
  }, [bookId, fingerprint, chapterTexts.length, refreshTick])

  return ready
}
