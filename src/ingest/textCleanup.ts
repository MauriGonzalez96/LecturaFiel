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

/**
 * Parte un texto largo en capítulos heurísticos.
 * Busca encabezados tipo «Capítulo N», «Chapter N», numeración romana, etc.
 */
export function splitIntoChapters(
  text: string,
  fallbackTitle = 'Texto completo',
): { number: number; title: string; text: string }[] {
  const cleaned = cleanupExtractedText(text)
  if (!cleaned) return []

  const heading =
    /(?:^|\n)[ \t]*(?:capítulo|capitulo|chapter|parte|book)\s+([ivxlcdm\d]+)[.\s:—-]*(.*)$/gim

  const matches = [...cleaned.matchAll(heading)]
  if (matches.length < 2) {
    return [{ number: 1, title: fallbackTitle, text: cleaned }]
  }

  const chapters: { number: number; title: string; text: string }[] = []

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]!
    const start = match.index ?? 0
    const end =
      i + 1 < matches.length ? (matches[i + 1]!.index ?? cleaned.length) : cleaned.length
    const body = cleaned.slice(start, end).trim()
    const numLabel = (match[1] ?? `${i + 1}`).trim()
    const rest = (match[2] ?? '').trim()
    const title = rest
      ? `Capítulo ${numLabel}: ${rest}`
      : `Capítulo ${numLabel}`

    if (body.length < 40) continue
    chapters.push({
      number: chapters.length + 1,
      title,
      text: body,
    })
  }

  return chapters.length > 0
    ? chapters
    : [{ number: 1, title: fallbackTitle, text: cleaned }]
}

export function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  // Quitar scripts/styles
  doc.querySelectorAll('script, style, nav, header, footer').forEach((el) => el.remove())
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
