/** Tamaño seguro por request (Piper/ONNX y límites prácticos de SAPI). */
export const SPEECH_CHUNK_MAX = 2600

/**
 * Parte el texto en trozos ≤ maxLen respetando oraciones cuando se puede.
 */
export function splitSpeechChunks(
  text: string,
  maxLen = SPEECH_CHUNK_MAX,
): string[] {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return []
  if (clean.length <= maxLen) return [clean]

  const sentences = clean.split(/(?<=[.!?…»"'])\s+|\n+/).filter(Boolean)
  const chunks: string[] = []
  let buf = ''

  const flush = () => {
    const t = buf.trim()
    if (t) chunks.push(t)
    buf = ''
  }

  for (const sentence of sentences) {
    if (sentence.length > maxLen) {
      flush()
      for (const piece of hardSplit(sentence, maxLen)) chunks.push(piece)
      continue
    }
    const next = buf ? `${buf} ${sentence}` : sentence
    if (next.length > maxLen) {
      flush()
      buf = sentence
    } else {
      buf = next
    }
  }
  flush()
  return chunks
}

function hardSplit(text: string, maxLen: number): string[] {
  const out: string[] = []
  let rest = text
  while (rest.length > maxLen) {
    let cut = rest.lastIndexOf(' ', maxLen)
    if (cut < maxLen * 0.5) cut = maxLen
    out.push(rest.slice(0, cut).trim())
    rest = rest.slice(cut).trim()
  }
  if (rest) out.push(rest)
  return out
}
