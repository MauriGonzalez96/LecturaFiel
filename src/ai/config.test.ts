import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('migrateAiModel / loadAiConfig', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    })
  })

  it('migra gemini-2.0-flash al cargar', async () => {
    localStorage.setItem(
      'lectura-fiel:ai-config',
      JSON.stringify({
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey: 'x',
        model: 'gemini-2.0-flash',
      }),
    )
    const { loadAiConfig, migrateAiModel } = await import('./config')
    expect(migrateAiModel('gemini-2.0-flash')).toBe('gemini-3-flash-preview')
    expect(loadAiConfig().model).toBe('gemini-3-flash-preview')
    expect(JSON.parse(localStorage.getItem('lectura-fiel:ai-config')!).model).toBe(
      'gemini-3-flash-preview',
    )
  })
})
