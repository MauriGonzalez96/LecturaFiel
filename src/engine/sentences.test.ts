import { describe, expect, it } from 'vitest'
import {
  clampSentenceIndex,
  sentenceSpans,
  splitSentences,
  textFromSentence,
} from './sentences'

describe('sentences', () => {
  it('parte por puntos y saltos de línea', () => {
    expect(splitSentences('Uno. Dos.\nTres!')).toEqual(['Uno.', 'Dos.', 'Tres!'])
  })

  it('reanuda desde una oración', () => {
    expect(textFromSentence('Uno. Dos. Tres.', 1)).toBe('Dos. Tres.')
  })

  it('calcula spans con offsets', () => {
    const text = 'Hola mundo. Chau.'
    const spans = sentenceSpans(text)
    expect(spans).toHaveLength(2)
    expect(text.slice(spans[0]!.start, spans[0]!.end)).toBe('Hola mundo.')
    expect(text.slice(spans[1]!.start, spans[1]!.end)).toBe('Chau.')
  })

  it('clampa el índice', () => {
    expect(clampSentenceIndex(-1, 5)).toBe(0)
    expect(clampSentenceIndex(9, 5)).toBe(4)
    expect(clampSentenceIndex(2, 0)).toBe(0)
  })
})
