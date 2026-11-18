import { chatCompletion } from './chatClient'
import { aiConfigured, loadAiConfig } from './config'
import type { BookChapter } from '../ingest/types'
import { renumberChapters, wordCount } from '../ingest/editChapters'

const PREVIEW_CHARS = 420
const WINDOW_CHARS = 2800
const MAX_SAMPLES = 36
const MAX_OUTPUT_TOKENS = 3500

const SYSTEM_PROMPT = `Sos un editor que detecta capítulos reales en libros en español.
Te paso fragmentos numerados (muestras) en orden del libro.
Respondé ÚNICAMENTE un objeto JSON válido, sin markdown, sin comentarios y sin texto alrededor.
Forma exacta:
{"chapters":[{"title":"string","startSample":0}]}

Reglas:
- startSample es el índice de la muestra donde EMPIEZA cada capítulo (entero 0-based).
- El primer capítulo debe empezar en 0.
- startSample debe ser estrictamente creciente.
- Preferí cortes literarios (Capítulo, Parte, cambios claros de tema).
- No inventes contenido: solo títulos cortos y puntos de corte.
- Si el libro es un solo ensayo sin cortes, devolvé 1 capítulo con título razonable.
- Máximo 30 capítulos.
- No uses comillas tipográficas ni trailing commas.`

type Sample = {
  index: number
  preview: string
  textStart: number
  textEnd: number
}

export type DetectChaptersResult = {
  chapters: BookChapter[]
  sampleCount: number
  model: string
}

type Cut = { title: string; startSample: number }

/**
 * Propone una nueva partición usando IA sobre muestras del texto.
 * El corte se aplica localmente sobre el texto completo (la IA no reescribe).
 */
export async function detectChaptersWithAi(opts: {
  bookTitle: string
  chapters: BookChapter[]
  signal?: AbortSignal
}): Promise<DetectChaptersResult> {
  const config = loadAiConfig()
  if (!aiConfigured(config)) {
    throw new Error('Configurá la IA en Ajustes antes de mejorar la partición.')
  }

  const fullText = joinBookText(opts.chapters)
  if (fullText.replace(/\s+/g, ' ').trim().length < 200) {
    throw new Error('No hay texto suficiente para detectar capítulos.')
  }

  const samples = buildSamples(opts.chapters, fullText)
  if (samples.length === 0) {
    throw new Error('No se pudieron armar muestras del libro.')
  }

  const userPayload = samples
    .map(
      (s) =>
        `### Muestra ${s.index}\n${s.preview}${s.preview.length >= PREVIEW_CHARS ? '…' : ''}`,
    )
    .join('\n\n')

  const raw = await chatCompletion(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          `Libro: «${opts.bookTitle}»\n` +
          `Hay ${samples.length} muestras en orden (índices 0..${samples.length - 1}).\n\n` +
          `${userPayload}\n\n` +
          `Devolvé SOLO el JSON {"chapters":[...]} con los capítulos detectados.`,
      },
    ],
    { temperature: 0.1, maxTokens: MAX_OUTPUT_TOKENS, signal: opts.signal },
  )

  let cuts: Cut[]
  try {
    cuts = parseCuts(raw, samples.length)
  } catch (firstErr) {
    // Un intento de reparación: muchos modelos envuelven o truncan el JSON.
    const repaired = await chatCompletion(
      [
        {
          role: 'system',
          content:
            'Convertí la respuesta a JSON válido con forma ' +
            '{"chapters":[{"title":"string","startSample":0}]}. ' +
            'Sin markdown ni texto extra. Conservá títulos y startSample si se entienden.',
        },
        {
          role: 'user',
          content:
            `Hay ${samples.length} muestras (0..${samples.length - 1}).\n` +
            `Repará este contenido y devolvé SOLO el JSON:\n\n${raw.slice(0, 6000)}`,
        },
      ],
      { temperature: 0, maxTokens: MAX_OUTPUT_TOKENS, signal: opts.signal },
    )
    try {
      cuts = parseCuts(repaired, samples.length)
    } catch {
      const hint =
        firstErr instanceof Error ? firstErr.message : 'JSON inválido'
      throw new Error(
        `${hint} Probá de nuevo; si sigue fallando, editá los cortes a mano.`,
      )
    }
  }

  const chapters = applyCuts(fullText, samples, cuts)
  if (chapters.length === 0) {
    throw new Error('La IA no devolvió cortes utilizables.')
  }

  return {
    chapters: renumberChapters(chapters),
    sampleCount: samples.length,
    model: loadAiConfig().model,
  }
}

export function joinBookText(chapters: BookChapter[]): string {
  return chapters
    .map((c) => c.text.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n')
}

export function buildSamples(
  chapters: BookChapter[],
  fullText: string,
): Sample[] {
  // Si ya hay varios bloques (p. ej. páginas), usarlos como muestras.
  if (chapters.length >= 2) {
    const samples: Sample[] = []
    let cursor = 0
    for (let i = 0; i < chapters.length && samples.length < MAX_SAMPLES; i++) {
      const piece = chapters[i]!.text.replace(/\s+/g, ' ').trim()
      if (!piece) continue
      const at = fullText.indexOf(piece.slice(0, Math.min(80, piece.length)), cursor)
      const textStart = at >= 0 ? at : cursor
      const textEnd = textStart + piece.length
      samples.push({
        index: samples.length,
        preview: piece.slice(0, PREVIEW_CHARS),
        textStart,
        textEnd: Math.min(textEnd, fullText.length),
      })
      cursor = textEnd
    }
    return samples
  }

  // Un solo bloque: ventanas fijas sobre el texto completo.
  const samples: Sample[] = []
  for (
    let start = 0;
    start < fullText.length && samples.length < MAX_SAMPLES;
    start += WINDOW_CHARS
  ) {
    const end = Math.min(fullText.length, start + WINDOW_CHARS)
    const slice = fullText.slice(start, end).trim()
    if (slice.length < 40) continue
    samples.push({
      index: samples.length,
      preview: slice.slice(0, PREVIEW_CHARS),
      textStart: start,
      textEnd: end,
    })
  }
  return samples
}

export function parseCuts(raw: string, sampleCount: number): Cut[] {
  const candidates = collectJsonCandidates(raw)
  let lastError = 'La IA no devolvió JSON válido para los capítulos.'

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown
      const cuts = cutsFromParsed(parsed, sampleCount)
      if (cuts) return cuts
      lastError = 'La IA no listó capítulos.'
    } catch {
      /* probar siguiente candidato */
    }
  }

  throw new Error(lastError)
}

function cutsFromParsed(
  parsed: unknown,
  sampleCount: number,
): Cut[] | null {
  const list = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as { chapters?: unknown }).chapters)
      ? (parsed as { chapters: unknown[] }).chapters
      : null

  if (!list || list.length === 0) return null

  const cuts: Cut[] = []
  for (const item of list.slice(0, 30)) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const startRaw =
      row.startSample ??
      row.start_sample ??
      row.sampleIndex ??
      row.sample_index ??
      row.sample ??
      row.start
    const startSample = Number(startRaw)
    if (!Number.isFinite(startSample)) continue
    const idx = Math.max(0, Math.min(sampleCount - 1, Math.floor(startSample)))
    const titleRaw = row.title ?? row.name ?? row.chapter
    const title =
      typeof titleRaw === 'string' && titleRaw.trim()
        ? titleRaw.trim().slice(0, 120)
        : `Capítulo ${cuts.length + 1}`
    if (cuts.length > 0 && idx <= cuts[cuts.length - 1]!.startSample) continue
    cuts.push({ title, startSample: idx })
  }

  if (cuts.length === 0) return null
  if (cuts[0]!.startSample !== 0) {
    cuts.unshift({
      title: 'Inicio / preliminares',
      startSample: 0,
    })
  }
  return cuts
}

export function applyCuts(
  fullText: string,
  samples: Sample[],
  cuts: Cut[],
): BookChapter[] {
  const chapters: BookChapter[] = []
  for (let i = 0; i < cuts.length; i++) {
    const cut = cuts[i]!
    const start = samples[cut.startSample]?.textStart ?? 0
    const end =
      i + 1 < cuts.length
        ? (samples[cuts[i + 1]!.startSample]?.textStart ?? fullText.length)
        : fullText.length
    const text = fullText.slice(start, end).trim()
    if (text.length < 40) continue
    chapters.push({
      number: chapters.length + 1,
      title: cut.title,
      text,
      chapterLabel: cut.title,
    })
  }
  return chapters
}

export function summarizePartition(chapters: BookChapter[]): {
  count: number
  totalWords: number
  titles: string[]
} {
  return {
    count: chapters.length,
    totalWords: chapters.reduce((n, c) => n + wordCount(c.text), 0),
    titles: chapters.map((c) => c.title),
  }
}

/** Extrae candidatos JSON (objeto/array) saneados a partir de texto libre. */
export function collectJsonCandidates(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  const out: string[] = []
  const push = (s: string) => {
    const cleaned = sanitizeJsonText(s)
    if (cleaned && !out.includes(cleaned)) out.push(cleaned)
  }

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) push(fence[1])

  for (const extracted of extractBalancedJsonChunks(trimmed)) {
    push(extracted)
  }

  // Último recurso: desde el primer { o [ hasta el final, saneado.
  const startObj = trimmed.indexOf('{')
  const startArr = trimmed.indexOf('[')
  const start =
    startObj < 0
      ? startArr
      : startArr < 0
        ? startObj
        : Math.min(startObj, startArr)
  if (start >= 0) push(trimmed.slice(start))

  return out
}

function extractBalancedJsonChunks(text: string): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i++) {
    const open = text[i]
    if (open !== '{' && open !== '[') continue
    const close = open === '{' ? '}' : ']'
    let depth = 0
    let inString = false
    let escape = false
    for (let j = i; j < text.length; j++) {
      const ch = text[j]!
      if (inString) {
        if (escape) {
          escape = false
          continue
        }
        if (ch === '\\') {
          escape = true
          continue
        }
        if (ch === '"') inString = false
        continue
      }
      if (ch === '"') {
        inString = true
        continue
      }
      if (ch === open) depth++
      else if (ch === close) {
        depth--
        if (depth === 0) {
          chunks.push(text.slice(i, j + 1))
          i = j
          break
        }
      }
    }
  }
  return chunks
}

function sanitizeJsonText(input: string): string {
  let s = input.trim()
  // Comillas tipográficas → ASCII
  s = s.replace(/[\u201C\u201D\u201E\u201F]/g, '"').replace(/[\u2018\u2019]/g, "'")
  // Trailing commas antes de } o ]
  s = s.replace(/,\s*([\]}])/g, '$1')
  // A veces el modelo deja un prefijo "json"
  s = s.replace(/^json\s*/i, '')
  return s.trim()
}
