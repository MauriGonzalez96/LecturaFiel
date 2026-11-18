import { useCallback, useRef, useState } from 'react'
import {
  summarizeBookQueue,
  type BookSummaryQueueProgress,
  type QueueChapterInput,
} from '../ai/summarizeBookQueue'

const IDLE: BookSummaryQueueProgress = {
  done: 0,
  total: 0,
  currentIndex: null,
  currentTitle: null,
  skipped: 0,
  failed: [],
  status: 'idle',
}

export function useBookSummaryQueue() {
  const [progress, setProgress] = useState<BookSummaryQueueProgress>(IDLE)
  const abortRef = useRef<AbortController | null>(null)

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
  }, [])

  const start = useCallback(
    async (opts: {
      bookId: string
      chapters: QueueChapterInput[]
      skipExisting?: boolean
      force?: boolean
      onProgress?: (p: BookSummaryQueueProgress) => void
    }) => {
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac

      setProgress({
        ...IDLE,
        total: opts.chapters.length,
        status: 'running',
      })

      const result = await summarizeBookQueue({
        bookId: opts.bookId,
        chapters: opts.chapters,
        skipExisting: opts.skipExisting,
        force: opts.force,
        signal: ac.signal,
        onProgress: (p) => {
          setProgress(p)
          opts.onProgress?.(p)
        },
      })

      if (abortRef.current === ac) abortRef.current = null
      setProgress(result)
      return result
    },
    [],
  )

  const reset = useCallback(() => {
    cancel()
    setProgress(IDLE)
  }, [cancel])

  return {
    progress,
    running: progress.status === 'running',
    start,
    cancel,
    reset,
  }
}
