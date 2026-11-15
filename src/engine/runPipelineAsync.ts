import type { InterventionOptions } from '../settings/intervention'
import type { PipelineResult } from '../types/lexicon'
import { runPipeline } from './pipeline'
import type {
  PipelineWorkerRequest,
  PipelineWorkerResponse,
} from './pipelineWorker'

let worker: Worker | null = null
let nextId = 1
const pending = new Map<
  number,
  {
    resolve: (r: PipelineResult) => void
    reject: (e: Error) => void
  }
>()

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  if (worker) return worker
  try {
    worker = new Worker(new URL('./pipelineWorker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (ev: MessageEvent<PipelineWorkerResponse>) => {
      const msg = ev.data
      const slot = pending.get(msg.id)
      if (!slot) return
      pending.delete(msg.id)
      if (msg.ok) slot.resolve(msg.result)
      else slot.reject(new Error(msg.error))
    }
    worker.onerror = () => {
      // Si el worker falla, las siguientes llamadas usan el hilo principal
      worker?.terminate()
      worker = null
      for (const [, slot] of pending) {
        slot.reject(new Error('Pipeline worker error'))
      }
      pending.clear()
    }
    return worker
  } catch {
    return null
  }
}

/**
 * Corre el pipeline fuera del hilo de UI cuando hay Worker disponible.
 */
export function runPipelineAsync(
  text: string,
  opts: {
    chapter?: number
    intervention?: InterventionOptions
  } = {},
): Promise<PipelineResult> {
  const chapter = opts.chapter ?? 1
  const w = getWorker()
  if (!w) {
    return Promise.resolve(
      runPipeline(text, { chapter, intervention: opts.intervention }),
    )
  }

  const id = nextId++
  return new Promise<PipelineResult>((resolve, reject) => {
    pending.set(id, { resolve, reject })
    const req: PipelineWorkerRequest = {
      id,
      text,
      chapter,
      intervention: opts.intervention,
    }
    w.postMessage(req)
  })
}

export function emptyPipelineResult(chapter = 1): PipelineResult {
  return runPipeline('', { chapter })
}
