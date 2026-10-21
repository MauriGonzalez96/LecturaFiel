import type { TextToken } from '../types/lexicon'
import { normalizeForm } from '../data/lexicon'

/** Divide el texto en tokens de palabra y no-palabra, conservando offsets. */
export function tokenize(text: string): TextToken[] {
  const tokens: TextToken[] = []
  const re = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)?|[^\p{L}\p{M}\p{N}]+/gu
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    const raw = match[0]
    const isWord = /[\p{L}\p{M}]/u.test(raw)
    tokens.push({
      raw,
      normalized: isWord ? normalizeForm(raw) : raw,
      isWord,
      start: match.index,
      end: match.index + raw.length,
    })
  }
  return tokens
}

/** Extrae la oración que contiene un offset de carácter. */
export function sentenceAround(text: string, offset: number): string {
  const delimiters = /[.!?…]/u
  let start = 0
  let end = text.length

  for (let i = offset; i >= 0; i--) {
    if (delimiters.test(text[i]!) && i < offset) {
      start = i + 1
      break
    }
  }
  for (let i = offset; i < text.length; i++) {
    if (delimiters.test(text[i]!)) {
      end = i + 1
      break
    }
  }

  return text.slice(start, end).replace(/\s+/g, ' ').trim()
}

/** Preserva mayúsculas del token original al aplicar un reemplazo. */
export function matchCasing(original: string, replacement: string): string {
  if (!original || !replacement) return replacement
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase()
  }
  if (original[0] === original[0]?.toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1)
  }
  return replacement
}
