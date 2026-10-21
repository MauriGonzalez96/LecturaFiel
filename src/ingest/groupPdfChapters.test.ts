import { describe, expect, it } from 'vitest'
import { groupPdfPages, PDF_PAGES_PER_CHUNK } from './groupPdfChapters'

describe('groupPdfPages', () => {
  it('agrupa páginas del mismo capítulo literario', () => {
    const chapters = groupPdfPages([
      {
        page: 1,
        text: 'Portada',
        chapterLabel: 'Inicio / preliminares',
        literaryChapter: 0,
      },
      {
        page: 2,
        text: 'Capítulo I: El comienzo. Texto A',
        chapterLabel: 'Capítulo I: El comienzo',
        literaryChapter: 1,
      },
      {
        page: 3,
        text: 'Sigue el capítulo I',
        chapterLabel: 'Capítulo I: El comienzo',
        literaryChapter: 1,
      },
      {
        page: 4,
        text: 'Capítulo II: El medio',
        chapterLabel: 'Capítulo II: El medio',
        literaryChapter: 2,
      },
    ])

    expect(chapters).toHaveLength(3)
    expect(chapters[0]!.pageFrom).toBe(1)
    expect(chapters[0]!.pageTo).toBe(1)
    expect(chapters[1]!.pageFrom).toBe(2)
    expect(chapters[1]!.pageTo).toBe(3)
    expect(chapters[1]!.text).toContain('Texto A')
    expect(chapters[1]!.text).toContain('Sigue el capítulo I')
    expect(chapters[2]!.literaryChapter).toBe(2)
  })

  it('sin encabezados, parte en bloques de páginas', () => {
    const pages = Array.from({ length: 20 }, (_, i) => ({
      page: i + 1,
      text: `pagina ${i + 1}`,
      chapterLabel: 'Inicio / preliminares',
      literaryChapter: 0,
    }))
    const chapters = groupPdfPages(pages)
    expect(chapters.length).toBe(Math.ceil(20 / PDF_PAGES_PER_CHUNK))
    expect(chapters[0]!.pageFrom).toBe(1)
    expect(chapters[0]!.pageTo).toBe(PDF_PAGES_PER_CHUNK)
    expect(chapters[chapters.length - 1]!.pageTo).toBe(20)
  })

  it('permite saltar a página dentro del rango', () => {
    const chapters = groupPdfPages([
      {
        page: 1,
        text: 'a',
        chapterLabel: 'Capítulo I',
        literaryChapter: 1,
      },
      {
        page: 2,
        text: 'b',
        chapterLabel: 'Capítulo I',
        literaryChapter: 1,
      },
      {
        page: 3,
        text: 'c',
        chapterLabel: 'Capítulo I',
        literaryChapter: 1,
      },
    ])
    const target = 2
    const index = chapters.findIndex(
      (c) =>
        c.pageFrom != null &&
        c.pageTo != null &&
        target >= c.pageFrom &&
        target <= c.pageTo,
    )
    expect(index).toBe(0)
  })
})
