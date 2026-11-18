import { describe, expect, it } from 'vitest'
import {
  mergeWithNext,
  renameChapter,
  restoreSourceChapters,
  splitChapterAt,
} from './editChapters'
import type { BookChapter } from './types'

function ch(
  partial: Partial<BookChapter> & { title: string; text: string },
): BookChapter {
  return {
    number: partial.number ?? 1,
    title: partial.title,
    text: partial.text,
    pageFrom: partial.pageFrom,
    pageTo: partial.pageTo,
    chapterLabel: partial.chapterLabel,
    literaryChapter: partial.literaryChapter,
  }
}

describe('editChapters', () => {
  it('renombra un capítulo', () => {
    const chapters = [
      ch({ number: 1, title: 'A', text: 'hola '.repeat(20) }),
      ch({ number: 2, title: 'B', text: 'mundo '.repeat(20) }),
    ]
    const next = renameChapter(chapters, 0, 'Nuevo título')
    expect(next[0]!.title).toBe('Nuevo título')
    expect(next[1]!.title).toBe('B')
  })

  it('une con el siguiente', () => {
    const chapters = [
      ch({
        number: 1,
        title: 'A',
        text: 'Primera parte del texto con suficiente longitud.',
        pageFrom: 1,
        pageTo: 2,
      }),
      ch({
        number: 2,
        title: 'B',
        text: 'Segunda parte del texto con suficiente longitud.',
        pageFrom: 3,
        pageTo: 4,
      }),
    ]
    const next = mergeWithNext(chapters, 0)
    expect(next).toHaveLength(1)
    expect(next[0]!.text).toContain('Primera parte')
    expect(next[0]!.text).toContain('Segunda parte')
    expect(next[0]!.pageFrom).toBe(1)
    expect(next[0]!.pageTo).toBe(4)
  })

  it('parte cerca de un punto', () => {
    const left = 'Oración uno del capítulo. '.repeat(8)
    const right = 'Oración dos del capítulo. '.repeat(8)
    const text = left + right
    const chapters = [ch({ number: 1, title: 'Solo', text })]
    const next = splitChapterAt(chapters, 0, left.length)
    expect(next).toHaveLength(2)
    expect(next[0]!.text.length).toBeGreaterThan(40)
    expect(next[1]!.text.length).toBeGreaterThan(40)
    expect(next[1]!.title).toMatch(/continuación/i)
  })

  it('restablece la partición original', () => {
    const source = [
      ch({ number: 1, title: 'Orig 1', text: 'aaa '.repeat(30) }),
      ch({ number: 2, title: 'Orig 2', text: 'bbb '.repeat(30) }),
    ]
    const current = mergeWithNext(source, 0)
    expect(current).toHaveLength(1)
    const restored = restoreSourceChapters(current, source)
    expect(restored).toHaveLength(2)
    expect(restored[0]!.title).toBe('Orig 1')
  })
})
