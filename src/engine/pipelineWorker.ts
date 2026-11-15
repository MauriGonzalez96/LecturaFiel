/// <reference lib="webworker" />
import type { InterventionOptions } from '../settings/intervention'
import type { PipelineResult } from '../types/lexicon'
import { runPipeline } from './pipeline'

export type PipelineWorkerRequest = {
  id: number
  text: string
  chapter: number
  intervention?: InterventionOptions
}

export type PipelineWorkerResponse =
  | { id: number; ok: true; result: PipelineResult }
  | { id: number; ok: false; error: string }

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = (ev: MessageEvent<PipelineWorkerRequest>) => {
  const { id, text, chapter, intervention } = ev.data
  try {
    const result = runPipeline(text, { chapter, intervention })
    const res: PipelineWorkerResponse = { id, ok: true, result }
    ctx.postMessage(res)
  } catch (err) {
    const res: PipelineWorkerResponse = {
      id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
    ctx.postMessage(res)
  }
}
