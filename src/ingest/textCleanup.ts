/** Normaliza espacios y limpia basura típica de extracción. */
export function cleanupExtractedText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

export type TextSplitKind = 'none' | 'classic' | 'weak'

export type SplitChaptersResult = {
  chapters: { number: number; title: string; text: string }[]
  kind: TextSplitKind
}

const CLASSIC_HEADING =
  /(?:^|\n)[ \t]*(?:capítulo|capitulo|chapter|parte|libro|book|sección|seccion)\s+([ivxlcdm\d]+)[.\s:—-]*(.*)$/gim

/** Markdown ATN, LIBRO/PARTE en mayúsculas, «1. Título» / «I. Título». */
const WEAK_HEADING =
  /(?:^|\n)(?:#{1,3}[ \t]+(.+)$|[ \t]*(?:LIBRO|PARTE|SECCIÓN|SECCION)\s+([IVXLCDM\d]+)[.\s:—-]*(.*)$|[ \t]*([IVXLCDM]{1,8}|\d{1,3})\.\s+([A-ZÁÉÍÓÚÜÑ][^\n]{2,90})$)/gim

/**
 * Parte un texto largo en capítulos heurísticos.
 * Primero encabezados clásicos; si fallan, numeración / markdown.
 */
export function splitIntoChapters(
  text: string,
  fallbackTitle = 'Texto completo',
): { number: number; title: string; text: string }[] {
  return splitIntoChaptersDetailed(text, fallbackTitle).chapters
}

export function splitIntoChaptersDetailed(
  text: string,
  fallbackTitle = 'Texto completo',
): SplitChaptersResult {
  const cleaned = cleanupExtractedText(text)
  if (!cleaned) return { chapters: [], kind: 'none' }

  const classic = sliceByHeading(cleaned, CLASSIC_HEADING, (m, i) => {
    const numLabel = (m[1] ?? `${i + 1}`).trim()
    const rest = (m[2] ?? '').trim()
    return rest ? `Capítulo ${numLabel}: ${rest}` : `Capítulo ${numLabel}`
  })
  if (classic.length >= 2) {
    return { chapters: classic, kind: 'classic' }
  }

  const weak = sliceByHeading(cleaned, WEAK_HEADING, (m, i) => {
    if (m[1]) return shortenTitle(m[1].trim(), i)
    if (m[2]) {
      const rest = (m[3] ?? '').trim()
      return rest
        ? `${(m[0].match(/LIBRO|PARTE|SECCI[OÓ]N/i)?.[0] ?? 'Parte').replace(/SECCION/i, 'Sección')} ${m[2]}: ${rest}`
        : `Parte ${m[2]}`
    }
    const num = (m[4] ?? `${i + 1}`).trim()
    const rest = (m[5] ?? '').trim()
    return rest ? `${num}. ${rest}` : `Sección ${num}`
  })
  if (weak.length >= 2) {
    return { chapters: weak, kind: 'weak' }
  }

  return {
    chapters: [{ number: 1, title: fallbackTitle, text: cleaned }],
    kind: 'none',
  }
}

function sliceByHeading(
  cleaned: string,
  heading: RegExp,
  titleFromMatch: (m: RegExpMatchArray, index: number) => string,
): { number: number; title: string; text: string }[] {
  heading.lastIndex = 0
  const matches = [...cleaned.matchAll(heading)]
  if (matches.length < 2) return []

  const chapters: { number: number; title: string; text: string }[] = []
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]!
    const start = match.index ?? 0
    const end =
      i + 1 < matches.length
        ? (matches[i + 1]!.index ?? cleaned.length)
        : cleaned.length
    const body = cleaned.slice(start, end).trim()
    if (body.length < 40) continue
    chapters.push({
      number: chapters.length + 1,
      title: titleFromMatch(match, chapters.length),
      text: body,
    })
  }
  return chapters
}

function shortenTitle(raw: string, index: number): string {
  const t = raw.replace(/^#+\s*/, '').trim()
  if (!t) return `Sección ${index + 1}`
  return t.length > 72 ? `${t.slice(0, 69)}…` : t
}

export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  // Quitar scripts/styles
  doc.querySelectorAll('script, style, nav, header, footer').forEach((el) =>
    el.remove(),
  )
  const text = doc.body?.textContent ?? ''
  return cleanupExtractedText(text)
}

export function detectFormat(fileName: string): import('./types').BookFormat {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (ext === 'txt') return 'txt'
  if (ext === 'md' || ext === 'markdown') return 'md'
  if (ext === 'epub') return 'epub'
  if (ext === 'pdf') return 'pdf'
  return 'unknown'
}
