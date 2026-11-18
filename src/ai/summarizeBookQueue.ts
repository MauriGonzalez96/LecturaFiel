import { textHash } from './hash'
import { summarizeChapter } from './summarizeChapter'
import { loadChapterSummary } from './summaryStorage'

export type QueueChapterInput = {
  index: number
  title: string
  text: string
}

export type BookSummaryQueueProgress = {
  done: number
  total: number
  currentIndex: number | null
  currentTitle: string | null
  skipped: number
  failed: { index: number; message: string }[]
  status: 'idle' | 'running' | 'completed' | 'cancelled' | 'error'
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const t = globalThis.setTimeout(() => resolve(), ms)
    const onAbort = () => {
      globalThis.clearTimeout(t)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function isAbortError(e: unknown): boolean {
  return (
    (e instanceof DOMException && e.name === 'AbortError') ||
    (e instanceof Error &&
      (e.name === 'AbortError' || /cancel/i.test(e.message)))
  )
}

function isRateLimited(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return /\b429\b|rate limit|quota/i.test(msg)
}

/**
 * Resume capítulos en secuencia (1 a la vez). Reutiliza caché si `skipExisting`.
 */
export async function summarizeBookQueue(opts: {
  bookId: string
  chapters: QueueChapterInput[]
  skipExisting?: boolean
  force?: boolean
  signal?: AbortSignal
  onProgress?: (p: BookSummaryQueueProgress) => void
}): Promise<BookSummaryQueueProgress> {
  const chapters = opts.chapters.filter((c) => c.text.replace(/\s+/g, ' ').trim())
  const total = chapters.length
  const skipExisting = opts.skipExisting !== false
  const force = Boolean(opts.force)

  const progress: BookSummaryQueueProgress = {
    done: 0,
    total,
    currentIndex: null,
    currentTitle: null,
    skipped: 0,
    failed: [],
    status: total === 0 ? 'completed' : 'running',
  }

  const emit = () => opts.onProgress?.({ ...progress, failed: [...progress.failed] })

  if (total === 0) {
    emit()
    return progress
  }

  emit()

  for (const ch of chapters) {
    if (opts.signal?.aborted) {
      progress.status = 'cancelled'
      progress.currentIndex = null
      progress.currentTitle = null
      emit()
      return progress
    }

    progress.currentIndex = ch.index
    progress.currentTitle = ch.title
    emit()

    const text = ch.text.replace(/\s+/g, ' ').trim()
    const hash = textHash(text)

    try {
      if (skipExisting && !force) {
        const cached = await loadChapterSummary(opts.bookId, ch.index, hash)
        if (cached?.summary) {
          progress.skipped += 1
          progress.done += 1
          emit()
          continue
        }
      }

      let attempt = 0
      for (;;) {
        attempt += 1
        try {
          await summarizeChapter({
            bookId: opts.bookId,
            chapterIndex: ch.index,
            title: ch.title || `Capítulo ${ch.index + 1}`,
            text,
            force,
            signal: opts.signal,
          })
          break
        } catch (e) {
          if (isAbortError(e) || opts.signal?.aborted) throw e
          if (isRateLimited(e) && attempt < 3) {
            await sleep(1500 * attempt, opts.signal)
            continue
          }
          throw e
        }
      }

      progress.done += 1
      emit()
    } catch (e) {
      if (isAbortError(e) || opts.signal?.aborted) {
        progress.status = 'cancelled'
        progress.currentIndex = null
        progress.currentTitle = null
        emit()
        return progress
      }
      progress.failed.push({
        index: ch.index,
        message: e instanceof Error ? e.message : String(e),
      })
      progress.done += 1
      emit()
    }
  }

  progress.currentIndex = null
  progress.currentTitle = null
  progress.status =
    progress.failed.length > 0 && progress.failed.length === total
      ? 'error'
      : 'completed'
  emit()
  return progress
}
