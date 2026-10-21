/** Multiplicador de velocidad de lectura (1 = normal). */
export const DEFAULT_SPEECH_RATE = 0.92

export const SPEECH_RATE_MIN = 0.7
export const SPEECH_RATE_MAX = 1.35
export const SPEECH_RATE_STEP = 0.05

export function clampSpeechRate(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_SPEECH_RATE
  const clamped = Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, n))
  return Math.round(clamped * 100) / 100
}

export function speechRateLabel(rate: number): string {
  if (rate <= 0.8) return 'Lenta'
  if (rate < 0.95) return 'Tranquila'
  if (rate <= 1.05) return 'Normal'
  if (rate <= 1.2) return 'Ágil'
  return 'Rápida'
}

/** Formato Edge TTS: "+10%" / "-20%". */
export function toEdgeRatePercent(rate: number): string {
  const pct = Math.round((clampSpeechRate(rate) - 1) * 100)
  return `${pct >= 0 ? '+' : ''}${pct}%`
}

/** Piper length_scale: mayor = más lento. */
export function toPiperLengthScale(rate: number): number {
  const r = clampSpeechRate(rate)
  if (r <= 0) return 1
  return Math.round((1 / r) * 1000) / 1000
}
