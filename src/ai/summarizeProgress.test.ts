import { beforeEach, describe, expect, it, vi } from 'vitest'

const memory = new Map<string, unknown>()

vi.mock('./config', () => ({
  aiConfigured: () => true,
  migrateAiModel: (m: string) => m,
  saveAiConfig: (partial: Record<string, string>) => ({
    baseUrl: 'https://example.test/v1',
    apiKey: 'k',
    model: 'test-model',
    ...partial,
  }),
  loadAiConfig: () => ({
    baseUrl: 'https://example.test/v1',
    apiKey: 'k',
    model: 'test-model',
  }),
}))

vi.mock('./summaryStorage', () => ({
  loadProgressSummary: async (bookId: string, upTo: number, hash: string) =>
    memory.get(`progress:${bookId}:${upTo}:${hash}`) ?? null,
  saveProgressSummary: async (summary: {
    bookId: string
    upToIndex: number
    textHash: string
  }) => {
    memory.set(
      `progress:${summary.bookId}:${summary.upToIndex}:${summary.textHash}`,
      summary,
    )
  },
}))

import { summarizeProgressSoFar } from './summarizeProgress'

describe('summarizeProgressSoFar', () => {
  beforeEach(() => {
    memory.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'Hasta aquí el autor fijó la tesis de la libertad económica.',
              },
            },
          ],
        }),
      })),
    )
  })

  it('genera y cachea el progreso', async () => {
    const first = await summarizeProgressSoFar({
      bookId: 'b',
      bookTitle: 'Libro',
      upToIndex: 1,
      chapterSummaries: [
        {
          chapterIndex: 0,
          title: 'Uno',
          summary: 'Se presenta el problema de la planificación.',
        },
        {
          chapterIndex: 1,
          title: 'Dos',
          summary: 'Se profundiza el vínculo con la libertad.',
        },
      ],
    })
    expect(first.summary).toMatch(/libertad|tesis|planificación/i)
    expect(first.kind).toBe('progress')

    const fetchMock = fetch as ReturnType<typeof vi.fn>
    const calls = fetchMock.mock.calls.length

    const second = await summarizeProgressSoFar({
      bookId: 'b',
      bookTitle: 'Libro',
      upToIndex: 1,
      chapterSummaries: [
        {
          chapterIndex: 0,
          title: 'Uno',
          summary: 'Se presenta el problema de la planificación.',
        },
        {
          chapterIndex: 1,
          title: 'Dos',
          summary: 'Se profundiza el vínculo con la libertad.',
        },
      ],
    })
    expect(second.summary).toBe(first.summary)
    expect(fetchMock.mock.calls.length).toBe(calls)
  })
})
