import { describe, expect, it } from 'vitest'
import { assessSplitConfidence, splitConfidenceHint } from './splitConfidence'

describe('assessSplitConfidence', () => {
  it('marca low con un solo capítulo', () => {
    expect(
      assessSplitConfidence({
        format: 'txt',
        chapters: [{ number: 1, title: 'Todo', text: 'x'.repeat(100) }],
      }),
    ).toBe('low')
  })

  it('marca low en PDF por bloques de páginas', () => {
    expect(
      assessSplitConfidence({
        format: 'pdf',
        chapters: [
          { number: 1, title: 'Págs. 1–8', text: 'a'.repeat(100) },
          { number: 2, title: 'Págs. 9–16', text: 'b'.repeat(100) },
        ],
        usedPageChunks: true,
      }),
    ).toBe('low')
  })

  it('marca high con encabezados clásicos', () => {
    expect(
      assessSplitConfidence({
        format: 'txt',
        chapters: [
          { number: 1, title: 'Cap 1', text: 'a'.repeat(100) },
          { number: 2, title: 'Cap 2', text: 'b'.repeat(100) },
        ],
        textSplitKind: 'classic',
      }),
    ).toBe('high')
  })

  it('explica el banner en PDF', () => {
    expect(splitConfidenceHint('low', 'pdf')).toMatch(/bloques de páginas/i)
    expect(splitConfidenceHint('high', 'pdf')).toBeNull()
  })
})
