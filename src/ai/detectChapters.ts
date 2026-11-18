import { aiConfigured, loadAiConfig } from './config'
import type { BookChapter } from '../ingest/types'
import { renumberChapters, wordCount } from '../ingest/editChapters'

const PREVIEW_CHARS = 700
const WINDOW_CHARS = 2800
const MAX_SAMPLES = 40
const MAX_OUTPUT_TOKENS = 2000

const SYSTEM_PROMPT = `Sos un editor que detecta capítulos reales en libros en español.
Te paso fragmentos numerados (muestras) en orden del libro.
Respondé SOLO un JSON válido (sin markdown) con esta forma:
{"chapters":[{"title":"string","startSample":0}]}

Reglas:
- startSample es el índice de la muestra donde EMPIEZA cada capítulo (0-based).
- El primer capítulo debe empezar en 0.
- startSample debe ser estrictamente creciente.
- Preferí cortes literarios (Capítulo, Parte, cambios claros de tema).
- No inventes contenido: solo títulos cortos y puntos de corte.
- Si el libro es un solo ensayo sin cortes, devolvé 1 capítulo con título razonable.
- Máximo 30 capítulos.`

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
          `Hay ${samples.length} muestras en orden.\n\n` +
          `${userPayload}\n\n` +
          `Devolvé el JSON con los capítulos detectados.`,
      },
    ],
    opts.signal,
  )

  const cuts = parseCuts(raw, samples.length)
  const chapters = applyCuts(fullText, samples, cuts)
  if (chapters.length === 0) {
    throw new Error('La IA no devolvió cortes utilizables.')
  }

  return {
    chapters: renumberChapters(chapters),
    sampleCount: samples.length,
    model: config.model,
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

export function parseCuts(
  raw: string,
  sampleCount: number,
): { title: string; startSample: number }[] {
  const jsonText = extractJsonObject(raw)
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('La IA no devolvió JSON válido para los capítulos.')
  }

  const list = Array.isArray(parsed)
    ? parsed
    : parsed &&
        typeof parsed === 'object' &&
        Array.isArray((parsed as { chapters?: unknown }).chapters)
      ? (parsed as { chapters: unknown[] }).chapters
      : null

  if (!list || list.length === 0) {
    throw new Error('La IA no listó capítulos.')
  }

  const cuts: { title: string; startSample: number }[] = []
  for (const item of list.slice(0, 30)) {
    if (!item || typeof item !== 'object') continue
    const row = item as { title?: unknown; startSample?: unknown }
    const startSample = Number(row.startSample)
    if (!Number.isFinite(startSample)) continue
    const idx = Math.max(0, Math.min(sampleCount - 1, Math.floor(startSample)))
    const title =
      typeof row.title === 'string' && row.title.trim()
        ? row.title.trim().slice(0, 120)
        : `Capítulo ${cuts.length + 1}`
    if (cuts.length > 0 && idx <= cuts[cuts.length - 1]!.startSample) continue
    cuts.push({ title, startSample: idx })
  }

  if (cuts.length === 0) {
    throw new Error('No se pudieron interpretar los cortes de la IA.')
  }
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
  cuts: { title: string; startSample: number }[],
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

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) return fence[1].trim()
  const startObj = trimmed.indexOf('{')
  const startArr = trimmed.indexOf('[')
  const start =
    startObj < 0
      ? startArr
      : startArr < 0
        ? startObj
        : Math.min(startObj, startArr)
  if (start < 0) return trimmed
  return trimmed.slice(start)
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
      temperature: 0.2,
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
