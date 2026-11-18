import { describe, expect, it } from 'vitest'
import { needsAiSplit } from './needsAiSplit'

describe('needsAiSplit', () => {
  it('true si hay un solo capítulo', () => {
    expect(
      needsAiSplit({
        format: 'txt',
        chapters: [{ number: 1, title: 'Todo', text: 'x'.repeat(200) }],
        splitConfidence: 'medium',
      }),
    ).toBe(true)
  })

  it('true si la confianza es low', () => {
    expect(
      needsAiSplit({
        format: 'pdf',
        chapters: [
          { number: 1, title: 'A', text: 'a'.repeat(100) },
          { number: 2, title: 'B', text: 'b'.repeat(100) },
        ],
        splitConfidence: 'low',
      }),
    ).toBe(true)
  })

  it('false si hay varios capítulos con confianza alta', () => {
    expect(
      needsAiSplit({
        format: 'epub',
        chapters: [
          { number: 1, title: 'A', text: 'a'.repeat(100), literaryChapter: 1 },
          { number: 2, title: 'B', text: 'b'.repeat(100), literaryChapter: 2 },
        ],
        splitConfidence: 'high',
      }),
    ).toBe(false)
  })
})
