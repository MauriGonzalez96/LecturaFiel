import { useCallback, useEffect, useRef, useState } from 'react'
import { aiConfigured, loadAiConfig } from '../ai/config'
import {
  chapterSummaryCacheKey,
  summarizeChapter,
} from '../ai/summarizeChapter'
import type { SummaryConcept } from '../ai/summaryConcepts'
import { loadChapterSummary } from '../ai/summaryStorage'
import type { ChapterSummary, SummaryStatus } from '../ai/types'

export function useChapterSummary(opts: {
  bookId: string | null
  chapterIndex: number
  title: string
  text: string
  /** Conceptos del pipeline (intercambios / glosario) del capítulo actual. */
  concepts?: SummaryConcept[]
  /** Cambiar para releer config IA (tras guardar API key). */
  configTick?: number
  /** Cambiar para releer caché (p. ej. tras cola de resúmenes). */
  refreshTick?: number
}) {
  const [summary, setSummary] = useState<ChapterSummary | null>(null)
  const [status, setStatus] = useState<SummaryStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const conceptsRef = useRef(opts.concepts)
  conceptsRef.current = opts.concepts

  const hash = chapterSummaryCacheKey(opts.text || '')
  const canRun = Boolean(opts.bookId && opts.text.trim())

  useEffect(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setError(null)
    setSummary(null)

    if (!opts.bookId || !opts.text.trim()) {
      setStatus('idle')
      return
    }
    if (!aiConfigured(loadAiConfig())) {
      setStatus('unconfigured')
      return
    }

    let cancelled = false
    // 'loading' mientras se consulta la caché evita que la cadena de
    // resúmenes dispare un generate antes de saber si ya había resumen.
    setStatus('loading')
    void loadChapterSummary(opts.bookId, opts.chapterIndex, hash).then(
      (cached) => {
        if (cancelled) return
        if (cached) {
          setSummary(cached)
          setStatus('ready')
        } else {
          setStatus('idle')
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [
    opts.bookId,
    opts.chapterIndex,
    hash,
    opts.text,
    opts.configTick,
    opts.refreshTick,
  ])

  const generate = useCallback(
    async (force = false) => {
      if (!opts.bookId || !opts.text.trim()) return
      if (!aiConfigured()) {
        setStatus('unconfigured')
        setError('Configurá la IA en Ajustes antes de resumir.')
        return
      }

      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setError(null)
      setStatus('loading')

      try {
        const result = await summarizeChapter({
          bookId: opts.bookId,
          chapterIndex: opts.chapterIndex,
          title: opts.title || `Capítulo ${opts.chapterIndex + 1}`,
          text: opts.text,
          concepts: conceptsRef.current,
          force,
          signal: ac.signal,
        })
        if (ac.signal.aborted) return
        setSummary(result)
        setStatus('ready')
      } catch (e) {
        if (ac.signal.aborted) return
        setStatus('error')
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [opts.bookId, opts.chapterIndex, opts.title, opts.text],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus(summary ? 'ready' : 'idle')
  }, [summary])

  return {
    summary,
    summaryText: summary?.summary ?? '',
    status,
    error,
    canRun,
    configured: aiConfigured(),
    generate,
    cancel,
  }
}
