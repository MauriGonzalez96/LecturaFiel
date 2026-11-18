import { loadAiConfig, migrateAiModel, saveAiConfig } from './config'
import { aiConfigured } from './config'
import type { AiConfig } from './types'

/** Modelos a probar si el configurado falla (retirado o saturado). */
export const GEMINI_MODEL_FALLBACKS = [
  'gemini-3-flash-preview',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite-preview',
] as const

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

function stripModelsPrefix(id: string): string {
  return id.replace(/^models\//, '')
}

export function parseAiErrorBody(raw: string): string {
  const text = raw.trim()
  if (!text) return ''
  try {
    const parsed = JSON.parse(text) as {
      error?: { message?: string; status?: string; code?: number | string }
      message?: string
    }
    const msg =
      parsed.error?.message?.trim() ||
      parsed.message?.trim() ||
      ''
    return msg
  } catch {
    return text.slice(0, 400)
  }
}

export function formatAiHttpError(status: number, body: string): string {
  const detail = parseAiErrorBody(body)
  if (!detail) return `La API de IA respondió ${status}`
  // Mensaje corto y accionable para modelos retirados.
  if (/no longer available|not found|NOT_FOUND/i.test(detail)) {
    return `IA (${status}): ${detail} Probá cambiar el modelo en Ajustes IA (p. ej. gemini-flash-latest).`
  }
  if (status === 503 || /high demand|unavailable/i.test(detail)) {
    return `IA (${status}): el modelo está saturado. Reintentá en unos segundos o usá otro modelo.`
  }
  return `IA (${status}): ${detail}`
}

function isModelGoneError(status: number, body: string): boolean {
  if (status !== 404) return false
  const detail = parseAiErrorBody(body)
  return /no longer available|not found|NOT_FOUND|is not found/i.test(
    detail || 'not found',
  )
}

function shouldTryNextGeminiModel(status: number, body: string): boolean {
  if (isModelGoneError(status, body)) return true
  if (status === 503) return true
  const detail = parseAiErrorBody(body)
  return /high demand|unavailable|overloaded/i.test(detail)
}

async function postChat(
  config: AiConfig,
  model: string,
  messages: ChatMessage[],
  opts: { temperature: number; maxTokens: number; signal?: AbortSignal },
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config.apiKey.trim()) {
    headers.Authorization = `Bearer ${config.apiKey.trim()}`
  }
  return fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: stripModelsPrefix(model),
      temperature: opts.temperature,
      max_tokens: opts.maxTokens,
      messages,
    }),
    signal: opts.signal,
  })
}

/**
 * Chat completions OpenAI-compatible (Gemini / OpenAI / Ollama).
 * Si Gemini responde 404 por modelo retirado, prueba fallbacks y persiste el que funcione.
 */
export async function chatCompletion(
  messages: ChatMessage[],
  opts: {
    temperature?: number
    maxTokens?: number
    signal?: AbortSignal
  } = {},
): Promise<string> {
  const config = loadAiConfig()
  if (!aiConfigured(config)) {
    throw new Error(
      'Configurá la IA en Ajustes (URL, modelo y, si hace falta, API key).',
    )
  }

  const temperature = opts.temperature ?? 0.3
  const maxTokens = opts.maxTokens ?? 1200
  const primary = migrateAiModel(config.model)
  const isGemini = /generativelanguage\.googleapis\.com/i.test(config.baseUrl)
  const candidates = [
    primary,
    ...(isGemini
      ? GEMINI_MODEL_FALLBACKS.filter((m) => m !== primary)
      : []),
  ]

  let lastStatus = 0
  let lastBody = ''

  for (let i = 0; i < candidates.length; i++) {
    const model = candidates[i]!
    const res = await postChat(config, model, messages, {
      temperature,
      maxTokens,
      signal: opts.signal,
    })

    if (res.ok) {
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[]
      }
      const content = data.choices?.[0]?.message?.content?.trim()
      if (content) {
        if (model !== config.model) {
          saveAiConfig({ model })
        }
        return content
      }
      lastStatus = res.status
      lastBody = 'La IA no devolvió texto'
      if (isGemini && i < candidates.length - 1) continue
      throw new Error('La IA no devolvió texto')
    }

    lastStatus = res.status
    lastBody = await res.text().catch(() => '')

    const canFallback =
      isGemini &&
      i < candidates.length - 1 &&
      shouldTryNextGeminiModel(res.status, lastBody)
    if (!canFallback) break
  }

  throw new Error(
    lastBody === 'La IA no devolvió texto'
      ? lastBody
      : formatAiHttpError(lastStatus, lastBody),
  )
}
