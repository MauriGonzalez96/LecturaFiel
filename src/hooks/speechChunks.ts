import { splitSentences } from '../engine/sentences'

/** Tamaño seguro por request (Piper/ONNX y límites prácticos de SAPI). */
export const SPEECH_CHUNK_MAX = 2600

export interface SpeechChunk {
  text: string
  /** Índice de la primera oración del trozo (sobre el texto completo). */
  sentenceIndex: number
}

/**
 * Parte el texto en trozos ≤ maxLen respetando oraciones cuando se puede.
 * Si `fromSentence` > 0, omite oraciones anteriores (reanudación).
 */
export function splitSpeechChunks(
  text: string,
  maxLen = SPEECH_CHUNK_MAX,
  fromSentence = 0,
): string[] {
  return splitSpeechChunksDetailed(text, maxLen, fromSentence).map((c) => c.text)
}

export function splitSpeechChunksDetailed(
  text: string,
  maxLen = SPEECH_CHUNK_MAX,
  fromSentence = 0,
): SpeechChunk[] {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return []

  const start = Math.max(0, Math.min(fromSentence, sentences.length - 1))
  const slice = sentences.slice(start)
  if (slice.join(' ').length <= maxLen) {
    return [{ text: slice.join(' '), sentenceIndex: start }]
  }

  const chunks: SpeechChunk[] = []
  let buf = ''
  let bufStart = start

  const flush = () => {
    const t = buf.trim()
    if (t) chunks.push({ text: t, sentenceIndex: bufStart })
    buf = ''
  }

  slice.forEach((sentence, offset) => {
    const absolute = start + offset
    if (sentence.length > maxLen) {
      flush()
      for (const piece of hardSplit(sentence, maxLen)) {
        chunks.push({ text: piece, sentenceIndex: absolute })
      }
      bufStart = absolute + 1
      return
    }
    const next = buf ? `${buf} ${sentence}` : sentence
    if (next.length > maxLen) {
      flush()
      buf = sentence
      bufStart = absolute
    } else {
      if (!buf) bufStart = absolute
      buf = next
    }
  })
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
