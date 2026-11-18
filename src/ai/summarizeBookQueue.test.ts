import { beforeEach, describe, expect, it, vi } from 'vitest'

const memory = new Map<string, unknown>()

vi.mock('./config', () => ({
  aiConfigured: () => true,
  migrateAiModel: (m: string) => m,
  saveAiConfig: (partial: Record<string, string>) => ({
    baseUrl: 'https://example.test/v1',
    apiKey: 'test-key',
    model: 'test-model',
    ...partial,
  }),
  loadAiConfig: () => ({
    baseUrl: 'https://example.test/v1',
    apiKey: 'test-key',
    model: 'test-model',
  }),
}))

vi.mock('./summaryStorage', () => ({
  loadChapterSummary: async (
    bookId: string,
    chapterIndex: number,
    hash: string,
  ) => memory.get(`${bookId}:${chapterIndex}:${hash}`) ?? null,
  saveChapterSummary: async (summary: {
    bookId: string
    chapterIndex: number
    textHash: string
  }) => {
    memory.set(
      `${summary.bookId}:${summary.chapterIndex}:${summary.textHash}`,
      summary,
    )
  },
}))

import { summarizeBookQueue } from './summarizeBookQueue'

describe('summarizeBookQueue', () => {
  beforeEach(() => {
    memory.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Resumen de prueba.' } }],
        }),
      })),
    )
  })

  it('resume varios capítulos en secuencia', async () => {
    const seen = new Set<number>()
    const result = await summarizeBookQueue({
      bookId: 'book-a',
      chapters: [
        { index: 0, title: 'Uno', text: 'Texto del capítulo uno con ideas.' },
        { index: 1, title: 'Dos', text: 'Texto del capítulo dos con ideas.' },
      ],
      skipExisting: false,
      force: true,
      onProgress: (p) => {
        if (p.currentIndex != null) seen.add(p.currentIndex)
      },
    })

    expect(result.status).toBe('completed')
    expect(result.done).toBe(2)
    expect(result.failed).toHaveLength(0)
    expect([...seen].sort()).toEqual([0, 1])
    expect(fetch).toHaveBeenCalled()
  })

  it('salta capítulos con resumen en caché', async () => {
    const text = 'Capítulo ya resumido con suficiente texto.'
    const { chapterSummaryCacheKey } = await import('./summarizeChapter')
    const hash = chapterSummaryCacheKey(text)
    memory.set('book-b:0:' + hash, {
      bookId: 'book-b',
      chapterIndex: 0,
      textHash: hash,
      title: 'Uno',
      summary: 'Ya estaba.',
      model: 'test-model',
      createdAt: new Date().toISOString(),
    })

    const result = await summarizeBookQueue({
      bookId: 'book-b',
      chapters: [
        { index: 0, title: 'Uno', text },
        { index: 1, title: 'Dos', text: 'Otro capítulo sin caché todavía.' },
      ],
      skipExisting: true,
    })

    expect(result.status).toBe('completed')
    expect(result.skipped).toBe(1)
    expect(result.done).toBe(2)
  })

  it('cancela a mitad de camino', async () => {
    const ac = new AbortController()
    let calls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        calls += 1
        if (calls === 1) ac.abort()
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: 'Resumen.' } }],
          }),
        }
      }),
    )

    const result = await summarizeBookQueue({
      bookId: 'book-c',
      chapters: [
        { index: 0, title: 'Uno', text: 'Primero con texto suficiente.' },
        { index: 1, title: 'Dos', text: 'Segundo con texto suficiente.' },
        { index: 2, title: 'Tres', text: 'Tercero con texto suficiente.' },
      ],
      force: true,
      signal: ac.signal,
    })

    expect(result.status).toBe('cancelled')
    expect(result.done).toBeLessThan(3)
  })
})
