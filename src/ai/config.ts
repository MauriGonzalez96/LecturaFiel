import { GEMINI_OPENAI_BASE } from './providers'
import type { AiConfig } from './types'

const STORAGE_KEY = 'lectura-fiel:ai-config'

/** Por defecto: Gemini (API key de Google AI Studio). */
export const DEFAULT_AI_CONFIG: AiConfig = {
  baseUrl: GEMINI_OPENAI_BASE,
  apiKey: '',
  model: 'gemini-2.0-flash',
}

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_AI_CONFIG }
    const parsed = JSON.parse(raw) as Partial<AiConfig>
    return {
      baseUrl: (parsed.baseUrl || DEFAULT_AI_CONFIG.baseUrl).replace(/\/$/, ''),
      apiKey: parsed.apiKey ?? '',
      model: parsed.model || DEFAULT_AI_CONFIG.model,
    }
  } catch {
    return { ...DEFAULT_AI_CONFIG }
  }
}

export function saveAiConfig(partial: Partial<AiConfig>): AiConfig {
  const next: AiConfig = {
    ...loadAiConfig(),
    ...partial,
  }
  next.baseUrl = next.baseUrl.replace(/\/$/, '')
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function aiConfigured(config: AiConfig = loadAiConfig()): boolean {
  // Ollama local a menudo no pide key
  const local =
    /localhost|127\.0\.0\.1/i.test(config.baseUrl) ||
    config.baseUrl.includes('11434')
  return Boolean(config.baseUrl && config.model && (config.apiKey || local))
}
