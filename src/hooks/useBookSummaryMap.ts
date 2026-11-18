import { useEffect, useMemo, useState } from 'react'
import {
  buildBookSummaryMap,
  type BookSummaryMapEntry,
} from '../ai/exportBookSummaries'
import { textHash } from '../ai/hash'

/**
 * Mapa capítulo → resumen (excerpt) para la vista Índice / export.
 */
export function useBookSummaryMap(
  bookId: string | null,
  chapters: { index: number; title: string; text: string }[],
  refreshTick = 0,
): BookSummaryMapEntry[] {
  const [entries, setEntries] = useState<BookSummaryMapEntry[]>([])
  const fingerprint = useMemo(
    () =>
      chapters
        .map(
          (c) =>
            `${c.index}:${textHash((c.text || '').replace(/\s+/g, ' ').trim())}`,
        )
        .join('|'),
    [chapters],
  )

  useEffect(() => {
    if (!bookId || chapters.length === 0) {
      setEntries([])
      return
    }

    let cancelled = false
    void buildBookSummaryMap(bookId, chapters).then((map) => {
      if (!cancelled) setEntries(map)
    })

    return () => {
      cancelled = true
    }
  }, [bookId, fingerprint, chapters, refreshTick])

  return entries
}
