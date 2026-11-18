import { beforeEach, describe, expect, it, vi } from 'vitest'

const listMock = vi.fn()

vi.mock('./summaryStorage', () => ({
  listSummariesForBook: (...args: unknown[]) => listMock(...args),
}))

import {
  buildBookSummariesMarkdown,
  buildBookSummaryMap,
} from './exportBookSummaries'

describe('exportBookSummaries', () => {
  beforeEach(() => {
    listMock.mockReset()
  })

  it('arma markdown solo con capítulos listos', () => {
    const md = buildBookSummariesMarkdown({
      bookTitle: 'Camino de servidumbre',
      entries: [
        {
          index: 0,
          title: 'Introducción',
          ready: true,
          excerpt: 'La planificación…',
          summary: 'La planificación central amenaza la libertad.',
          createdAt: '2026-01-01T12:00:00.000Z',
          model: 'gemini-2.0-flash',
        },
        {
          index: 1,
          title: 'Sin resumen',
          ready: false,
          excerpt: '',
          summary: null,
          createdAt: null,
          model: null,
        },
      ],
    })

    expect(md).toContain('# Camino de servidumbre')
    expect(md).toContain('## 1. Introducción')
    expect(md).toContain('planificación central')
    expect(md).not.toContain('Sin resumen')
  })

  it('marca ready solo si el hash coincide', async () => {
    const text = 'Texto actual del capítulo uno.'
    const { chapterSummaryCacheKey } = await import('./summarizeChapter')
    const hash = chapterSummaryCacheKey(text)
    listMock.mockResolvedValue([
      {
        bookId: 'b1',
        chapterIndex: 0,
        textHash: hash,
        title: 'Uno',
        summary: 'Idea fundamental del capítulo.',
        model: 'm',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ])

    const map = await buildBookSummaryMap('b1', [
      { index: 0, title: 'Uno', text },
      { index: 1, title: 'Dos', text: 'Otro capítulo sin resumen.' },
    ])

    expect(map[0]!.ready).toBe(true)
    expect(map[0]!.excerpt).toMatch(/Idea fundamental/)
    expect(map[1]!.ready).toBe(false)
  })
})
