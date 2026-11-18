import { beforeEach, describe, expect, it, vi } from 'vitest'

const memory = new Map<string, unknown>()

vi.mock('./config', () => ({
  aiConfigured: () => true,
  loadAiConfig: () => ({
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: 'AIza-test-fake-key',
    model: 'gemini-2.0-flash',
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

import { textHash } from './hash'
import { summarizeChapter } from './summarizeChapter'

const sample =
  'El autor sostiene que la planificación central destruye la libertad económica. ' +
  'Repite varios ejemplos históricos y anécdotas. ' +
  'La tesis es que el control del Estado sobre precios conduce al autoritarismo.'

describe('summarizeChapter (mock Gemini)', () => {
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
                  'La planificación central amenaza la libertad: controlar precios empuja al autoritarismo.',
              },
            },
          ],
        }),
      })),
    )
  })

  it('llama a chat/completions de Gemini', async () => {
    const result = await summarizeChapter({
      bookId: 'test-book',
      chapterIndex: 0,
      title: 'Capítulo 1',
      text: sample,
      force: true,
    })

    expect(result.summary).toMatch(/planificación|libertad|autoritarismo/i)
    expect(result.model).toBe('gemini-2.0-flash')
    expect(result.textHash).toBe(textHash(sample))
    expect(fetch).toHaveBeenCalled()
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(url)).toContain(
      'generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    )
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer AIza-test-fake-key',
    })
  })

  it('reusa caché si no se fuerza', async () => {
    await summarizeChapter({
      bookId: 'test-book',
      chapterIndex: 1,
      title: 'Capítulo 2',
      text: sample,
      force: true,
    })
    ;(fetch as ReturnType<typeof vi.fn>).mockClear()

    const cached = await summarizeChapter({
      bookId: 'test-book',
      chapterIndex: 1,
      title: 'Capítulo 2',
      text: sample,
      force: false,
    })

    expect(cached.summary.length).toBeGreaterThan(10)
    expect(fetch).not.toHaveBeenCalled()
  })
})
