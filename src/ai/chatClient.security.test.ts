import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./config', () => ({
  aiConfigured: () => true,
  migrateAiModel: (m: string) => m,
  saveAiConfig: vi.fn(),
  loadAiConfig: () => ({
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKey: 'AIzaSy-SECRET-LIVE',
    model: 'gemini-3-flash-preview',
  }),
}))

import { chatCompletion, formatAiHttpError } from './chatClient'

describe('chatClient seguridad', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('manda Bearer pero el error HTTP no refleja la API key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          error: { message: 'API key not valid. Please pass a valid API key.' },
        }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      chatCompletion([{ role: 'user', content: 'hola' }]),
    ).rejects.toThrow()

    const init = fetchMock.mock.calls[0]![1] as RequestInit
    const headers = init.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer AIzaSy-SECRET-LIVE')

    const msg = formatAiHttpError(
      401,
      JSON.stringify({
        error: { message: 'API key not valid. Please pass a valid API key.' },
      }),
    )
    expect(msg).not.toContain('AIzaSy-SECRET-LIVE')
  })

  it('no acepta body vacío como éxito opaco', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      chatCompletion([{ role: 'user', content: 'hola' }]),
    ).rejects.toThrow(/no devolvió texto/i)
  })
})
