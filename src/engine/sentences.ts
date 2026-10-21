/**
 * Parte el texto en oraciones (misma heurística que el TTS).
 */
export function splitSentences(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  return clean.split(/(?<=[.!?…»"'])\s+|\n+/).filter(Boolean)
}

export interface SentenceSpan {
  index: number
  start: number
  end: number
  text: string
}

/**
 * Oraciones con offsets sobre el texto fuente.
 * El índice coincide con splitSentences / TTS.
 */
export function sentenceSpans(text: string): SentenceSpan[] {
  const parts = splitSentences(text)
  if (parts.length === 0) return []

  const spans: SentenceSpan[] = []
  let cursor = 0

  for (let index = 0; index < parts.length; index++) {
    const part = parts[index]!
    const found = findPhrase(text, part, cursor)
    if (!found) {
      spans.push({
        index,
        start: cursor,
        end: cursor,
        text: part,
      })
      continue
    }
    spans.push({
      index,
      start: found.start,
      end: found.end,
      text: text.slice(found.start, found.end),
    })
    cursor = found.end
  }

  return spans
}

/** Busca la frase permitiendo diferencias de espacios. */
function findPhrase(
  haystack: string,
  needle: string,
  from: number,
): { start: number; end: number } | null {
  const normNeedle = needle.replace(/\s+/g, ' ').trim()
  if (!normNeedle) return null

  let i = Math.max(0, from)
  while (i < haystack.length) {
    while (i < haystack.length && /\s/.test(haystack[i]!)) i += 1
    if (i >= haystack.length) break

    let hi = i
    let ni = 0
    let start = -1

    while (hi < haystack.length && ni < normNeedle.length) {
      const h = haystack[hi]!
      const n = normNeedle[ni]!
      if (/\s/.test(h) && /\s/.test(n)) {
        while (hi < haystack.length && /\s/.test(haystack[hi]!)) hi += 1
        while (ni < normNeedle.length && /\s/.test(normNeedle[ni]!)) ni += 1
        continue
      }
      if (/\s/.test(h)) {
        hi += 1
        continue
      }
      if (h.toLowerCase() !== n.toLowerCase()) break
      if (start < 0) start = hi
      hi += 1
      ni += 1
    }

    if (ni >= normNeedle.length && start >= 0) {
      return { start, end: hi }
    }
    i += 1
  }
  return null
}

export function clampSentenceIndex(index: number, count: number): number {
  if (count <= 0) return 0
  return Math.max(0, Math.min(Math.floor(index), count - 1))
}

/** Une oraciones desde `from` para reanudar el audio. */
export function textFromSentence(text: string, fromSentence: number): string {
  const parts = splitSentences(text)
  if (parts.length === 0) return ''
  const i = clampSentenceIndex(fromSentence, parts.length)
  return parts.slice(i).join(' ')
}
