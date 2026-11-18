import { chatCompletion } from './chatClient'
import { loadAiConfig } from './config'
import { textHash } from './hash'
import {
  loadChapterSummary,
  saveChapterSummary,
} from './summaryStorage'
import type { ChapterSummary } from './types'

const CHUNK_CHARS = 10_000
const MAX_OUTPUT_TOKENS = 1200

const SYSTEM_PROMPT = `Sos un editor de audiolibros en español. Tu trabajo es extraer la IDEA FUNDAMENTAL de cada capítulo para que se pueda escuchar sin rodeos.

Reglas:
- Explicá la tesis / argumento central con claridad y precisión.
- Eliminá ejemplos repetitivos, anécdotas, digresiones y relleno retórico.
- Conservá matices importantes y distinciones conceptuales del autor.
- No inventes ideas que no estén en el texto.
- Español claro, párrafos cortos, tono serio pero accesible.
- Aptitud para lectura en voz alta (frases naturales, sin listas interminables).
- Si el capítulo es introductorio o de transición, decilo en una frase y resumí el aporte real.
- Longitud: lo necesario para entender la idea (aprox. 5–12% del original, o menos si era muy reiterativo).`

function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= CHUNK_CHARS) return [clean]
  const parts: string[] = []
  let i = 0
  while (i < clean.length) {
    let end = Math.min(i + CHUNK_CHARS, clean.length)
    if (end < clean.length) {
      const slice = clean.slice(i, end)
      const lastStop = Math.max(
        slice.lastIndexOf('. '),
        slice.lastIndexOf('? '),
        slice.lastIndexOf('! '),
      )
      if (lastStop > CHUNK_CHARS * 0.5) end = i + lastStop + 1
    }
    parts.push(clean.slice(i, end).trim())
    i = end
  }
  return parts.filter(Boolean)
}

async function summarizePiece(
  title: string,
  piece: string,
  partLabel: string,
  signal?: AbortSignal,
): Promise<string> {
  return chatCompletion(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          `Capítulo: «${title}» (${partLabel})\n\n` +
          `Texto:\n${piece}\n\n` +
          `Redactá el resumen de la idea fundamental de este tramo.`,
      },
    ],
    { temperature: 0.3, maxTokens: MAX_OUTPUT_TOKENS, signal },
  )
}

/**
 * Resume un capítulo (con caché). Si el texto es largo, resume por partes y luego fusiona.
 */
export async function summarizeChapter(opts: {
  bookId: string
  chapterIndex: number
  title: string
  text: string
  force?: boolean
  signal?: AbortSignal
}): Promise<ChapterSummary> {
  const text = opts.text.replace(/\s+/g, ' ').trim()
  if (!text) throw new Error('Este capítulo no tiene texto para resumir')

  const hash = textHash(text)
  if (!opts.force) {
    const cached = await loadChapterSummary(
      opts.bookId,
      opts.chapterIndex,
      hash,
    )
    if (cached?.summary) return cached
  }

  const config = loadAiConfig()
  const chunks = chunkText(text)
  let summary: string

  if (chunks.length === 1) {
    summary = await summarizePiece(
      opts.title,
      chunks[0],
      'capítulo completo',
      opts.signal,
    )
  } else {
    const partials: string[] = []
    for (let i = 0; i < chunks.length; i++) {
      if (opts.signal?.aborted) throw new Error('Cancelado')
      partials.push(
        await summarizePiece(
          opts.title,
          chunks[i],
          `parte ${i + 1} de ${chunks.length}`,
          opts.signal,
        ),
      )
    }
    summary = await chatCompletion(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content:
            `Capítulo: «${opts.title}»\n\n` +
            `Estos son resúmenes parciales del mismo capítulo. Fusionálos en UN solo resumen coherente, ` +
            `sin repeticiones, con la idea fundamental del capítulo entero:\n\n` +
            partials.map((p, i) => `--- Parte ${i + 1} ---\n${p}`).join('\n\n'),
        },
      ],
      { temperature: 0.3, maxTokens: MAX_OUTPUT_TOKENS, signal: opts.signal },
    )
  }

  const record: ChapterSummary = {
    bookId: opts.bookId,
    chapterIndex: opts.chapterIndex,
    textHash: hash,
    title: opts.title,
    summary: summary.trim(),
    model: config.model,
    createdAt: new Date().toISOString(),
  }
  await saveChapterSummary(record)
  return record
}
