import type { AiConfig } from './types'

export type AiProviderId = 'gemini' | 'openai' | 'ollama' | 'custom'

export interface AiProviderPreset {
  id: AiProviderId
  label: string
  hint: string
  config: Pick<AiConfig, 'baseUrl' | 'model'>
  needsKey: boolean
  keyHelp?: string
}

/** Gemini vía capa compatible con OpenAI (API key de Google AI Studio). */
export const GEMINI_OPENAI_BASE =
  'https://generativelanguage.googleapis.com/v1beta/openai'

export const AI_PROVIDERS: AiProviderPreset[] = [
  {
    id: 'gemini',
    label: 'Gemini (Google)',
    hint: 'Usá Gemini con una API key de Google AI Studio (guía paso a paso en la pantalla).',
    config: {
      baseUrl: GEMINI_OPENAI_BASE,
      model: 'gemini-3-flash-preview',
    },
    needsKey: true,
    keyHelp: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    hint: 'ChatGPT API (cuenta de pago / créditos).',
    config: {
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini',
    },
    needsKey: true,
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    hint: 'Sin key. Requiere Ollama instalado en esta PC.',
    config: {
      baseUrl: 'http://127.0.0.1:11434/v1',
      model: 'llama3.2',
    },
    needsKey: false,
  },
]

export function detectProvider(config: AiConfig): AiProviderId {
  const url = config.baseUrl.toLowerCase()
  if (url.includes('generativelanguage.googleapis.com')) return 'gemini'
  if (url.includes('api.openai.com')) return 'openai'
  if (url.includes('11434') || /localhost|127\.0\.0\.1/.test(url)) return 'ollama'
  return 'custom'
}
