import { loadAiConfig, migrateAiModel, saveAiConfig } from './config'
import { aiConfigured } from './config'
import type { AiConfig } from './types'

/** Modelos a probar si el configurado falla (retirado, saturado o vacío). */
export const GEMINI_MODEL_FALLBACKS = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-flash-latest',
] as const

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type ChatChoice = {
  finish_reason?: string
  message?: { content?: string | null }
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
  if (/no longer available|not found|NOT_FOUND/i.test(detail)) {
    return `IA (${status}): ${detail} Probá cambiar el modelo en Ajustes IA (p. ej. gemini-3-flash-preview).`
  }
  if (status === 503 || /high demand|unavailable/i.test(detail)) {
    return `IA (${status}): el modelo está saturado. Reintentá en unos segundos o usá otro modelo.`
  }
  if (status === 400 && /api key|invalid/i.test(detail)) {
    return `IA (${status}): API key inválida. Regenerala en Google AI Studio y pegala en Ajustes.`
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
  if (status === 429) return true
  const detail = parseAiErrorBody(body)
  return /high demand|unavailable|overloaded|rate limit|quota/i.test(detail)
}

function extractChoiceContent(data: {
  choices?: ChatChoice[]
}): { content: string; finishReason: string } {
  const choice = data.choices?.[0]
  const raw = choice?.message?.content
  const content = typeof raw === 'string' ? raw.trim() : ''
  return {
    content,
    finishReason: String(choice?.finish_reason ?? ''),
  }
}

async function postChat(
  config: AiConfig,
  model: string,
  messages: ChatMessage[],
  opts: {
    temperature: number
    maxTokens: number
    signal?: AbortSignal
    isGemini: boolean
  },
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config.apiKey.trim()) {
    headers.Authorization = `Bearer ${config.apiKey.trim()}`
  }

  const body: Record<string, unknown> = {
    model: stripModelsPrefix(model),
    temperature: opts.temperature,
    max_tokens: opts.maxTokens,
    messages,
  }

  // Gemini 3 “piensa” antes de escribir; sin esto max_tokens chicos
  // consumen el presupuesto en thinking y el content llega vacío.
  if (opts.isGemini) {
    body.reasoning_effort = 'minimal'
  }

  return fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: opts.signal,
  })
}

/**
 * Chat completions OpenAI-compatible (Gemini / OpenAI / Ollama).
 * Si Gemini falla (404/503/vacío), prueba fallbacks y persiste el que funcione.
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
  let maxTokens = Math.max(256, opts.maxTokens ?? 1600)
  const primary = migrateAiModel(config.model)
  const isGemini = /generativelanguage\.googleapis\.com/i.test(config.baseUrl)
  // Gemini thinking: asegurar presupuesto mínimo razonable.
  if (isGemini) maxTokens = Math.max(maxTokens, 768)

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
    let attemptTokens = maxTokens

    for (let bump = 0; bump < 2; bump++) {
      const res = await postChat(config, model, messages, {
        temperature,
        maxTokens: attemptTokens,
        signal: opts.signal,
        isGemini,
      })

      if (res.ok) {
        const data = (await res.json()) as { choices?: ChatChoice[] }
        const { content, finishReason } = extractChoiceContent(data)
        if (content) {
          if (model !== config.model) {
            saveAiConfig({ model })
          }
          return content
        }

        // Vacío por thinking que se comió max_tokens → subir presupuesto.
        if (
          isGemini &&
          bump === 0 &&
          (finishReason === 'length' || !finishReason)
        ) {
          attemptTokens = Math.min(8192, Math.max(attemptTokens * 2, 2048))
          continue
        }

        lastStatus = res.status
        lastBody = 'La IA no devolvió texto'
        break
      }

      lastStatus = res.status
      lastBody = await res.text().catch(() => '')
      break
    }

    const canFallback =
      isGemini &&
      i < candidates.length - 1 &&
      (lastBody === 'La IA no devolvió texto' ||
        shouldTryNextGeminiModel(lastStatus, lastBody))
    if (!canFallback) break
  }

  throw new Error(
    lastBody === 'La IA no devolvió texto'
      ? 'La IA no devolvió texto (posible límite de tokens o modelo saturado). Reintentá.'
      : formatAiHttpError(lastStatus, lastBody),
  )
}
