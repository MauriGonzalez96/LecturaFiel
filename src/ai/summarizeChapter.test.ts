import { beforeEach, describe, expect, it, vi } from 'vitest'

const memory = new Map<string, unknown>()

vi.mock('./config', () => ({
  aiConfigured: () => true,
  migrateAiModel: (m: string) => m,
  saveAiConfig: (partial: Record<string, string>) => ({
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: 'AIza-test-fake-key',
    model: 'gemini-3-flash-preview',
    ...partial,
  }),
  loadAiConfig: () => ({
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: 'AIza-test-fake-key',
    model: 'gemini-3-flash-preview',
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
import {
  normalizeSummaryMarkup,
  summarizeChapter,
} from './summarizeChapter'

const sample =
  'El autor sostiene que la planificación central destruye la libertad económica. ' +
  'Repite varios ejemplos históricos y anécdotas. ' +
  'La tesis es que el control del Estado sobre precios conduce al autoritarismo.'

describe('normalizeSummaryMarkup', () => {
  it('cambia **negrita** por «comillas latinas»', () => {
    expect(
      normalizeSummaryMarkup(
        'El **historicismo** ahogó el **conocimiento**.',
      ),
    ).toBe('El «historicismo» ahogó el «conocimiento».')
  })
})

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
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content:
                  'La **planificación** central amenaza la libertad: controlar precios empuja al autoritarismo.',
              },
            },
          ],
        }),
      })),
    )
    const result = await summarizeChapter({
      bookId: 'test-book',
      chapterIndex: 0,
      title: 'Capítulo 1',
      text: sample,
      force: true,
    })

    expect(result.summary).toContain('«planificación»')
    expect(result.summary).not.toContain('**')
    expect(result.summary).toMatch(/planificación|libertad|autoritarismo/i)
    expect(result.model).toBe('gemini-3-flash-preview')
    expect(result.textHash).toBe(
      textHash(`explicacion-neutra-v5\n${sample}`),
    )
    expect(fetch).toHaveBeenCalled()
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(String(url)).toContain(
      'generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    )
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer AIza-test-fake-key',
    })
  })

  it('incluye conceptos intercambiados en el prompt', async () => {
    await summarizeChapter({
      bookId: 'test-book',
      chapterIndex: 2,
      title: 'Capítulo conceptos',
      text: sample,
      force: true,
      concepts: [
        {
          term: 'servidumbre',
          plain: 'esclavitud',
          definition: 'Dependencia forzada.',
          context: 'El camino de servidumbre comienza así.',
        },
      ],
    })

    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]!
    const body = JSON.parse(String((init as RequestInit).body)) as {
      messages: { role: string; content: string }[]
    }
    const user = body.messages.find((m) => m.role === 'user')?.content ?? ''
    expect(user).toMatch(/servidumbre/)
    expect(user).toMatch(/esclavitud/)
    expect(user).toMatch(/Dependencia forzada/)
    expect(user).toMatch(/Integrálos|conceptos difíciles/i)
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
