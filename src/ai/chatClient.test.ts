import { beforeEach, describe, expect, it, vi } from 'vitest'

const saveAiConfig = vi.fn((partial: { model?: string }) => ({
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: 'k',
  model: partial.model ?? 'gemini-2.0-flash',
}))

vi.mock('./config', () => ({
  aiConfigured: () => true,
  migrateAiModel: (m: string) =>
    m === 'gemini-2.0-flash' ? 'gemini-3-flash-preview' : m,
  saveAiConfig: (partial: { model?: string }) => saveAiConfig(partial),
  loadAiConfig: () => ({
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: 'k',
    model: 'gemini-2.0-flash',
  }),
}))

import {
  chatCompletion,
  formatAiHttpError,
  parseAiErrorBody,
} from './chatClient'

describe('parseAiErrorBody / formatAiHttpError', () => {
  it('extrae el mensaje de error de Gemini', () => {
    const body = JSON.stringify({
      error: {
        code: 404,
        message:
          'This model models/gemini-2.0-flash is no longer available. Please update your code to use models/gemini-3.8-flash',
        status: 'NOT_FOUND',
      },
    })
    expect(parseAiErrorBody(body)).toMatch(/no longer available/)
    expect(formatAiHttpError(404, body)).toMatch(/Ajustes IA/)
  })
})

describe('chatCompletion fallback de modelo', () => {
  beforeEach(() => {
    saveAiConfig.mockClear()
  })

  it('reintenta con otro modelo si el primero devolvió 404', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () =>
          JSON.stringify({
            error: {
              message:
                'This model models/gemini-2.0-flash is no longer available',
              status: 'NOT_FOUND',
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'ok resumen' } }],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const text = await chatCompletion([
      { role: 'user', content: 'hola' },
    ])

    expect(text).toBe('ok resumen')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const firstBody = JSON.parse(
      String((fetchMock.mock.calls[0]![1] as RequestInit).body),
    )
    const secondBody = JSON.parse(
      String((fetchMock.mock.calls[1]![1] as RequestInit).body),
    )
    // migrateAiModel convierte 2.0 → 3-flash-preview antes del primer intento
    expect(firstBody.model).toBe('gemini-3-flash-preview')
    expect(firstBody.reasoning_effort).toBe('minimal')
    expect(secondBody.model).not.toBe(firstBody.model)
    expect(saveAiConfig).toHaveBeenCalled()
  })

  it('sube max_tokens si Gemini responde vacío por length', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              finish_reason: 'length',
              message: { role: 'assistant' },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'texto ok' } }],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const text = await chatCompletion([{ role: 'user', content: 'hola' }], {
      maxTokens: 256,
    })
    expect(text).toBe('texto ok')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const first = JSON.parse(
      String((fetchMock.mock.calls[0]![1] as RequestInit).body),
    )
    const second = JSON.parse(
      String((fetchMock.mock.calls[1]![1] as RequestInit).body),
    )
    expect(second.max_tokens).toBeGreaterThan(first.max_tokens)
  })

  it('reintenta si el modelo responde 503 por demanda', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () =>
          JSON.stringify({
            error: { message: 'high demand', status: 'UNAVAILABLE' },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'resumen ok' } }],
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    const text = await chatCompletion([{ role: 'user', content: 'hola' }])
    expect(text).toBe('resumen ok')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
