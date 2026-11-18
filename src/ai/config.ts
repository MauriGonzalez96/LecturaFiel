import { GEMINI_OPENAI_BASE } from './providers'
import type { AiConfig } from './types'

const STORAGE_KEY = 'lectura-fiel:ai-config'

/** Modelos Gemini retirados o bloqueados para cuentas nuevas → reemplazo. */
const DEPRECATED_GEMINI_MODELS: Record<string, string> = {
  'gemini-2.0-flash': 'gemini-3-flash-preview',
  'gemini-2.0-flash-lite': 'gemini-3.1-flash-lite-preview',
  'gemini-1.5-flash': 'gemini-3-flash-preview',
  'gemini-1.5-flash-latest': 'gemini-3-flash-preview',
  'gemini-1.5-pro': 'gemini-pro-latest',
  'gemini-pro': 'gemini-pro-latest',
  'gemini-2.5-flash': 'gemini-3-flash-preview',
  'gemini-2.5-flash-lite': 'gemini-3.1-flash-lite-preview',
  'gemini-2.5-pro': 'gemini-pro-latest',
}

/** Por defecto: Gemini (API key de Google AI Studio). */
export const DEFAULT_AI_CONFIG: AiConfig = {
  baseUrl: GEMINI_OPENAI_BASE,
  apiKey: '',
  // Preview estable para cuentas nuevas; chatClient hace fallback si satura.
  model: 'gemini-3-flash-preview',
}

export function migrateAiModel(model: string): string {
  const key = model.replace(/^models\//, '').trim()
  return DEPRECATED_GEMINI_MODELS[key] ?? key
}

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_AI_CONFIG }
    const parsed = JSON.parse(raw) as Partial<AiConfig>
    const model = migrateAiModel(parsed.model || DEFAULT_AI_CONFIG.model)
    const next: AiConfig = {
      baseUrl: (parsed.baseUrl || DEFAULT_AI_CONFIG.baseUrl).replace(/\/$/, ''),
      apiKey: parsed.apiKey ?? '',
      model,
    }
    // Persistí la migración si el modelo guardado estaba obsoleto.
    if (parsed.model && migrateAiModel(parsed.model) !== parsed.model) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* ignore quota */
      }
    }
    return next
  } catch {
    return { ...DEFAULT_AI_CONFIG }
  }
}

export function saveAiConfig(partial: Partial<AiConfig>): AiConfig {
  const current = loadAiConfig()
  const next: AiConfig = {
    ...current,
    ...partial,
  }
  next.baseUrl = next.baseUrl.replace(/\/$/, '')
  if (partial.model != null) {
    next.model = migrateAiModel(partial.model)
  }
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
