import { aiConfigured, loadAiConfig } from './config'
import { textHash } from './hash'
import {
  loadProgressSummary,
  saveProgressSummary,
} from './summaryStorage'
import type { ChapterSummary, ProgressSummary } from './types'

const MAX_OUTPUT_TOKENS = 1400

const SYSTEM_PROMPT = `Sos un editor de audiolibros en español. Te pasan resúmenes de capítulos ya hechos.
Redactá un «resumen hasta aquí» del arco del libro: qué se estableció, cómo avanzó el argumento y dónde queda el lector.
Reglas:
- No inventes capítulos que no estén en los resúmenes.
- Español claro, párrafos cortos, apto para voz alta.
- 1–3 minutos de lectura en voz (aprox. 180–450 palabras).
- Sin listas interminables ni spoilers de lo que no vino aún.`

/**
 * Sintetiza el progreso del libro a partir de resúmenes de capítulos 0..upToIndex.
 */
export async function summarizeProgressSoFar(opts: {
  bookId: string
  bookTitle: string
  upToIndex: number
  /** Resúmenes ya listos, en orden de capítulo. */
  chapterSummaries: Pick<ChapterSummary, 'chapterIndex' | 'title' | 'summary'>[]
  force?: boolean
  signal?: AbortSignal
}): Promise<ProgressSummary> {
  const config = loadAiConfig()
  if (!aiConfigured(config)) {
    throw new Error('Configurá la IA en Ajustes antes de generar el progreso.')
  }

  const ordered = [...opts.chapterSummaries]
    .filter((s) => s.chapterIndex <= opts.upToIndex && s.summary.trim())
    .sort((a, b) => a.chapterIndex - b.chapterIndex)

  if (ordered.length === 0) {
    throw new Error(
      'Necesitás al menos un resumen de capítulo (hasta el actual) para armar el progreso.',
    )
  }

  const hash = textHash(
    ordered.map((s) => `${s.chapterIndex}:${s.summary}`).join('\n---\n'),
  )

  if (!opts.force) {
    const cached = await loadProgressSummary(
      opts.bookId,
      opts.upToIndex,
      hash,
    )
    if (cached?.summary) return cached
  }

  const payload = ordered
    .map(
      (s) =>
        `### Cap. ${s.chapterIndex + 1} — ${s.title}\n${s.summary.trim()}`,
    )
    .join('\n\n')

  const summary = await chatCompletion(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          `Libro: «${opts.bookTitle}»\n` +
          `Progreso hasta el capítulo ${opts.upToIndex + 1} (incluidos ${ordered.length} resúmenes):\n\n` +
          `${payload}\n\n` +
          `Redactá el resumen acumulado «hasta aquí».`,
      },
    ],
    opts.signal,
  )

  const record: ProgressSummary = {
    kind: 'progress',
    bookId: opts.bookId,
    upToIndex: opts.upToIndex,
    textHash: hash,
    title: `Hasta el capítulo ${opts.upToIndex + 1}`,
    summary: summary.trim(),
    model: config.model,
    createdAt: new Date().toISOString(),
  }
  await saveProgressSummary(record)
  return record
}

async function chatCompletion(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  signal?: AbortSignal,
): Promise<string> {
  const config = loadAiConfig()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config.apiKey.trim()) {
    headers.Authorization = `Bearer ${config.apiKey.trim()}`
  }

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      temperature: 0.3,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages,
    }),
    signal,
  })

  if (!res.ok) {
    let detail = ''
    try {
      const err = (await res.json()) as { error?: { message?: string } }
      detail = err.error?.message ?? ''
    } catch {
      detail = await res.text().catch(() => '')
    }
    throw new Error(
      detail
        ? `IA (${res.status}): ${detail}`
        : `La API de IA respondió ${res.status}`,
    )
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('La IA no devolvió texto')
  return content
}
