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
const PROMPT_VERSION = 'explicacion-neutra-v5'

export function chapterSummaryCacheKey(text: string): string {
  return textHash(`${PROMPT_VERSION}\n${text.replace(/\s+/g, ' ').trim()}`)
}

/**
 * Convierte **negrita** markdown a «comillas latinas» para el narrador.
 * No toca pares de «» ya correctos.
 */
export function normalizeSummaryMarkup(text: string): string {
  return text
    .replace(/\*\*([^*]+?)\*\*/g, '«$1»')
    .replace(/_{2}([^_]+?)_{2}/g, '«$1»')
    .trim()
}

const SYSTEM_PROMPT = `Redactá en español una EXPLICACIÓN DETALLADA del capítulo para audiolibro. El texto debe transmitir la esencia del autor: qué sostiene, por qué, y con qué conceptos.

Reglas de tono:
- Tono expositivo y neutro. NO tutees ni hables al oyente («vos», «tú», «escuchame», «te cuento», «prestá atención»).
- No uses segunda persona. Escribí como una explicación clara en tercera persona o impersonal.
- Prosa viva y fiel, sin sonar a panfleto ni a chat informal.

Marcado para narración (obligatorio):
- NUNCA uses markdown ni asteriscos (**palabra** o *palabra*). Prohibido.
- Las palabras clave y conceptos importantes van entre comillas latinas: «palabra».
- Si aparece un término raro, técnico o poco habitual, escribiló así en la misma frase: «término raro», breve explicación clara, y seguí la idea sin cortar el hilo.
  Ejemplo: …surgió el «historicismo», la idea de que la historia obedece leyes inevitables, y con ello…
- Usá «» solo para marcar (clave o rareza + glosa breve); no abuses ni envuelvas oraciones enteras.

Contenido:
- Introducí los conceptos del autor: nombrá la idea, explicá qué significa y para qué la usa en este tramo.
- Explicá cada concepto EN CONTEXTO: cómo encaja en el argumento, qué problema responde, qué contraste o peligro señala.
- Si hay una lista de «conceptos difíciles» (intercambiados o en glosario), tejelos en la narración con «término» + sentido y contexto. No los dejes como lista al final.
- Desarrollá el razonamiento (pasos, objeciones, matices), no solo la conclusión.
- Conservá distinciones importantes; podés citar frases literales del autor con comillas tipográficas “…” (distintas de «»).
- Recortá solo repetición pura y relleno.
- No inventes ideas que no estén en el texto ni en la lista de conceptos.
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
          `Redactá la explicación detallada de este tramo: conceptos del autor (y los de la lista si hay) en contexto, sin tuteo y sin perder la esencia del argumento.`,
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
            `Estas son explicaciones parciales del mismo capítulo. Fusionálas en UNA sola explicación coherente del capítulo entero: ` +
            `conceptos en contexto, sin tuteo, sin repeticiones ni pérdida de matices:\n\n` +
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
    summary: normalizeSummaryMarkup(summary),
    model: config.model,
    createdAt: new Date().toISOString(),
  }
  await saveChapterSummary(record)
  return record
}
