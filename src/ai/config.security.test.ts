import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('ai config seguridad', () => {
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
    vi.resetModules()
  })

  it('no escribe la key en el modelo migrado como texto suelto fuera de JSON', async () => {
    const secret = 'AIzaSy-SECRET-TEST-KEY-DO-NOT-LEAK'
    localStorage.setItem(
      'lektor:ai-config',
      JSON.stringify({
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey: secret,
        model: 'gemini-2.0-flash',
      }),
    )
    const { loadAiConfig } = await import('./config')
    const cfg = loadAiConfig()
    expect(cfg.apiKey).toBe(secret)
    expect(cfg.model).toBe('gemini-3-flash-preview')
    const persisted = localStorage.getItem('lektor:ai-config')!
    expect(persisted).toContain(secret)
    // Solo en el campo JSON, no como query string.
    expect(persisted).not.toMatch(/[?&]key=/)
    expect(persisted).not.toMatch(/api_key=/)
  })

  it('aiConfigured exige key salvo localhost', async () => {
    const { saveAiConfig, aiConfigured } = await import('./config')
    saveAiConfig({
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: '',
      model: 'gemini-3-flash-preview',
    })
    expect(aiConfigured()).toBe(false)

    saveAiConfig({
      baseUrl: 'http://127.0.0.1:11434/v1',
      apiKey: '',
      model: 'llama3',
    })
    expect(aiConfigured()).toBe(true)
  })
})
