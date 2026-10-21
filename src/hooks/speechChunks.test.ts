import { describe, expect, it } from 'vitest'
import { SPEECH_CHUNK_MAX, splitSpeechChunks } from './speechChunks'

describe('splitSpeechChunks', () => {
  it('no parte textos cortos', () => {
    expect(splitSpeechChunks('Hola mundo.')).toEqual(['Hola mundo.'])
  })

  it('parte por oraciones sin superar el máximo', () => {
    const sentence = 'Esta es una oración de prueba. '
    const text = sentence.repeat(200)
    const chunks = splitSpeechChunks(text, 500)
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(500)
    }
    expect(chunks.join(' ').replace(/\s+/g, ' ')).toContain('oración de prueba')
  })

  it('el máximo por defecto cubre el límite de Piper', () => {
    expect(SPEECH_CHUNK_MAX).toBeLessThanOrEqual(2800)
    expect(SPEECH_CHUNK_MAX).toBeGreaterThan(1000)
  })
})
