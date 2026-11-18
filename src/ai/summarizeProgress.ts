import { chatCompletion } from './chatClient'
import { aiConfigured, loadAiConfig } from './config'
import { textHash } from './hash'
import {
  loadProgressSummary,
  saveProgressSummary,
} from './summaryStorage'
import type { ChapterSummary, ProgressSummary } from './types'

const MAX_OUTPUT_TOKENS = 2800
const PROMPT_VERSION = 'progreso-detallado-v1'

const SYSTEM_PROMPT = `Sos un editor de audiolibros en español. Te pasan explicaciones detalladas de capítulos ya hechas.
Redactá un «hasta aquí» del arco del libro: qué se estableció, cómo avanzó el argumento y dónde queda el lector.
Reglas:
- No inventes capítulos que no estén en los textos dados.
- Conservá matices importantes; no reduzcas todo a una slogan.
- Español claro, párrafos cortos, apto para voz alta.
- Longitud: aprox. 3–6 minutos de lectura en voz (unas 450–900 palabras), según lo rico que sea el material.
- Sin listas interminables ni spoilers de lo que no vino aún.
- Sin markdown, sin títulos con **, sin viñetas: solo prosa.`

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
    `${PROMPT_VERSION}\n` +
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
    { temperature: 0.3, maxTokens: MAX_OUTPUT_TOKENS, signal: opts.signal },
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
