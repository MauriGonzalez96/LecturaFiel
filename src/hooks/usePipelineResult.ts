import { useEffect, useState } from 'react'
import {
  emptyPipelineResult,
  runPipelineAsync,
} from '../engine/runPipelineAsync'
import type { InterventionOptions } from '../settings/intervention'
import type { PipelineResult } from '../types/lexicon'

/**
 * Corre el pipeline en un Web Worker (fallback al hilo principal).
 * Evita congelar la UI en capítulos largos.
 */
export function usePipelineResult(
  text: string,
  chapter: number,
  intervention: InterventionOptions,
  /** Dependencias extra (caché, cotidianas, etc.) */
  bustKey: string | number,
): { result: PipelineResult; pending: boolean } {
  const [result, setResult] = useState<PipelineResult>(() =>
    emptyPipelineResult(chapter),
  )
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    setPending(true)
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const next = await runPipelineAsync(text, {
            chapter,
            intervention,
          })
          if (!cancelled) setResult(next)
        } catch {
          if (!cancelled) {
            setResult(emptyPipelineResult(chapter))
          }
        } finally {
          if (!cancelled) setPending(false)
        }
      })()
    }, 40)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [text, chapter, intervention, bustKey])

  return { result, pending }
}
