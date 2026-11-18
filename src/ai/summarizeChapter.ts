import { chatCompletion } from './chatClient'
import { loadAiConfig } from './config'
import { textHash } from './hash'
import {
  formatConceptsForPrompt,
  type SummaryConcept,
} from './summaryConcepts'
import {
  loadChapterSummary,
  saveChapterSummary,
} from './summaryStorage'
import type { ChapterSummary } from './types'

const CHUNK_CHARS = 10_000
const MAX_OUTPUT_TOKENS = 4096
/** Cambia esto para invalidar cachés de resúmenes viejos. */
const PROMPT_VERSION = 'esencia-conceptos-v3'

export function chapterSummaryCacheKey(text: string): string {
  return textHash(`${PROMPT_VERSION}\n${text.replace(/\s+/g, ' ').trim()}`)
}

const SYSTEM_PROMPT = `Sos quien leyó este capítulo con atención y pasión, y ahora se lo contás a un amigo inteligente en español, en voz alta. No sos un abstract académico ni un telegrama: sos la persona que entiende al autor y quiere que el otro también lo entienda.

Tu trabajo: una EXPLICACIÓN DETALLADA que transmita la esencia del capítulo — qué sostiene el autor, por qué, y con qué conceptos.

Reglas:
- Presentá e introducí los conceptos del autor: nombrá la idea, explicá qué significa y para qué la usa en este tramo.
- Explicá cada concepto EN CONTEXTO: cómo encaja en el argumento, qué problema responde, qué contraste o peligro señala el autor.
- Si te paso una lista de «conceptos difíciles» (palabras que Lectura Fiel intercambió o puso en glosario), DEBELAS tejer en la narración: presentá el término del autor, explicá su sentido y decí en qué contexto del capítulo aparece. No hagas una lista suelta al final: integralos donde corresponden en el relato.
- Contá el desarrollo del razonamiento (pasos, objeciones, matices), no solo la conclusión.
- Conservá el “golpe” del autor: la tensión, la advertencia o la intuición central, con calor humano pero sin inventar.
- Podés citar o parafrasear de cerca frases clave (entre comillas si son literales).
- Recortá solo repetición pura y relleno; no aplastés la riqueza del pensamiento.
- No inventes ideas, ejemplos ni conceptos que no estén en el texto ni en la lista de conceptos.
- Prosa clara, párrafos cortos, tono vivo y fiel, apto para escuchar.
- Sin markdown, sin listas interminables, sin cercas de código: solo prosa.
- Longitud orientativa: aprox. 25–45% del original (más si es denso; menos solo si era muy reiterativo).`

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

function conceptsBlock(concepts: SummaryConcept[] | undefined): string {
  const block = formatConceptsForPrompt(concepts ?? [])
  return block ? `\n\n${block}\n` : ''
}

async function summarizePiece(
  title: string,
  piece: string,
  partLabel: string,
  concepts: SummaryConcept[] | undefined,
  signal?: AbortSignal,
): Promise<string> {
  return chatCompletion(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          `Capítulo: «${title}» (${partLabel})\n\n` +
          `Texto:\n${piece}` +
          `${conceptsBlock(concepts)}\n` +
          `Contame este tramo como quien leyó el libro con pasión: introducí los conceptos del autor (y los de la lista si hay), explicálos en contexto y no pierdas la esencia del argumento.`,
      },
    ],
    { temperature: 0.25, maxTokens: MAX_OUTPUT_TOKENS, signal },
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
  /** Conceptos del pipeline (intercambios / glosario) a integrar en la explicación. */
  concepts?: SummaryConcept[]
  force?: boolean
  signal?: AbortSignal
}): Promise<ChapterSummary> {
  const text = opts.text.replace(/\s+/g, ' ').trim()
  if (!text) throw new Error('Este capítulo no tiene texto para resumir')

  const hash = chapterSummaryCacheKey(text)
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
  const concepts = opts.concepts ?? []
  let summary: string

  if (chunks.length === 1) {
    summary = await summarizePiece(
      opts.title,
      chunks[0],
      'capítulo completo',
      concepts,
      opts.signal,
    )
  } else {
    const partials: string[] = []
    for (let i = 0; i < chunks.length; i++) {
      if (opts.signal?.aborted) throw new Error('Cancelado')
      // En partes largas, pasamos todos los conceptos: el modelo elige los del tramo.
      partials.push(
        await summarizePiece(
          opts.title,
          chunks[i],
          `parte ${i + 1} de ${chunks.length}`,
          concepts,
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
            `Capítulo: «${opts.title}»\n` +
            `${conceptsBlock(concepts)}\n` +
            `Estas son explicaciones parciales del mismo capítulo. Fusionálas en UNA sola narración coherente, ` +
            `como quien cuenta la esencia del capítulo entero: conceptos introducidos y explicados en contexto, sin repeticiones ni pérdida de matices:\n\n` +
            partials.map((p, i) => `--- Parte ${i + 1} ---\n${p}`).join('\n\n'),
        },
      ],
      { temperature: 0.25, maxTokens: MAX_OUTPUT_TOKENS, signal: opts.signal },
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
