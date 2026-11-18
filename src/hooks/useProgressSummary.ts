import { useCallback, useEffect, useRef, useState } from 'react'
import { aiConfigured } from '../ai/config'
import { summarizeProgressSoFar } from '../ai/summarizeProgress'
import type { ChapterSummary, ProgressSummary, SummaryStatus } from '../ai/types'

export function useProgressSummary(opts: {
  bookId: string | null
  bookTitle: string
  upToIndex: number
  /** Resúmenes listos del mapa (con summary). */
  readySummaries: Pick<
    ChapterSummary,
    'chapterIndex' | 'title' | 'summary'
  >[]
  refreshTick?: number
}) {
  const [progress, setProgress] = useState<ProgressSummary | null>(null)
  const [status, setStatus] = useState<SummaryStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const usable = opts.readySummaries.filter(
    (s) => s.chapterIndex <= opts.upToIndex && s.summary.trim(),
  )
  const usableKey = usable
    .map((s) => `${s.chapterIndex}:${s.summary.length}:${s.title}`)
    .join('|')
  const canRun = Boolean(opts.bookId && usable.length > 0)

  useEffect(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setProgress(null)
    setError(null)
    if (!opts.bookId || usable.length === 0) {
      setStatus(aiConfigured() ? 'idle' : 'unconfigured')
      return
    }
    if (!aiConfigured()) {
      setStatus('unconfigured')
      return
    }
    setStatus('idle')
  }, [opts.bookId, opts.upToIndex, opts.refreshTick, usable.length, usableKey])

  const generate = useCallback(
    async (force = false) => {
      const chapters = opts.readySummaries.filter(
        (s) => s.chapterIndex <= opts.upToIndex && s.summary.trim(),
      )
      if (!opts.bookId || chapters.length === 0) return
      if (!aiConfigured()) {
        setStatus('unconfigured')
        setError('Configurá la IA en Ajustes.')
        return
      }
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setStatus('loading')
      setError(null)
      try {
        const result = await summarizeProgressSoFar({
          bookId: opts.bookId,
          bookTitle: opts.bookTitle,
          upToIndex: opts.upToIndex,
          chapterSummaries: chapters,
          force,
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        setProgress(result)
        setStatus('ready')
      } catch (e) {
        if (ac.signal.aborted) return
        setStatus('error')
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [opts.bookId, opts.bookTitle, opts.upToIndex, opts.readySummaries],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus(progress ? 'ready' : 'idle')
  }, [progress])

  return {
    progress,
    progressText: progress?.summary ?? '',
    status,
    error,
    canRun,
    availableCount: usable.length,
    generate,
    cancel,
  }
}
