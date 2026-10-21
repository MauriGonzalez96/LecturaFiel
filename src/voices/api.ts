import type {
  NeuralVoice,
  PiperVoiceInfo,
  VoicePrefs,
  VoiceSource,
} from './types'

export const DEFAULT_SAMPLE =
  'En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo.'

export async function ttsApiAvailable(): Promise<boolean> {
  try {
    const r = await fetch('/api/health', { cache: 'no-store' })
    if (!r.ok) return false
    const data = (await r.json()) as { tts?: boolean }
    return Boolean(data.tts)
  } catch {
    return false
  }
}

export async function fetchNeuralVoices(): Promise<{
  voices: NeuralVoice[]
  sampleText: string
}> {
  const r = await fetch('/api/voices/neural', { cache: 'no-store' })
  if (!r.ok) throw new Error('No se pudieron cargar las voces neurales')
  const data = (await r.json()) as {
    voices?: NeuralVoice[]
    sampleText?: string
  }
  return {
    voices: data.voices ?? [],
    sampleText: data.sampleText ?? DEFAULT_SAMPLE,
  }
}

export async function fetchPiperVoices(): Promise<{
  voices: PiperVoiceInfo[]
  sampleText: string
}> {
  const r = await fetch('/api/voices/piper', { cache: 'no-store' })
  if (!r.ok) throw new Error('No se pudieron cargar las voces Piper')
  const data = (await r.json()) as {
    voices?: PiperVoiceInfo[]
    sampleText?: string
  }
  return {
    voices: data.voices ?? [],
    sampleText: data.sampleText ?? DEFAULT_SAMPLE,
  }
}

export async function downloadPiperVoice(voiceId: string): Promise<void> {
  const r = await fetch('/api/voices/piper/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voiceId }),
  })
  const data = (await r.json()) as { error?: string }
  if (!r.ok) throw new Error(data.error || 'Error al descargar modelo Piper')
}

export async function fetchVoicePrefs(): Promise<{
  prefs: VoicePrefs
  sampleText: string
}> {
  const r = await fetch('/api/voices/prefs', { cache: 'no-store' })
  if (!r.ok) throw new Error('No se pudieron cargar preferencias de voz')
  const data = (await r.json()) as { prefs: VoicePrefs; sampleText?: string }
  return {
    prefs: data.prefs,
    sampleText: data.sampleText ?? DEFAULT_SAMPLE,
  }
}

export async function saveVoicePrefs(
  source: VoiceSource,
  voiceId: string,
): Promise<VoicePrefs> {
  const r = await fetch('/api/voices/prefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, voiceId }),
  })
  if (!r.ok) throw new Error('No se pudo guardar la voz')
  const data = (await r.json()) as { prefs: VoicePrefs }
  return data.prefs
}

export async function previewVoice(
  source: 'neural' | 'piper',
  voiceId: string,
  text: string,
): Promise<string> {
  const r = await fetch('/api/voices/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, voiceId, text }),
  })
  const data = (await r.json()) as { url?: string; error?: string }
  if (!r.ok || !data.url) throw new Error(data.error || 'Error al generar audio')
  return data.url
}

export async function speakRemote(
  source: 'neural' | 'piper',
  voiceId: string,
  text: string,
): Promise<string> {
  const r = await fetch('/api/voices/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, voiceId, text }),
  })
  const data = (await r.json()) as { url?: string; error?: string }
  if (!r.ok || !data.url) throw new Error(data.error || 'Error al generar audio')
  return data.url
}

/** @deprecated usar previewVoice */
export async function previewNeural(
  voiceId: string,
  text: string,
): Promise<string> {
  return previewVoice('neural', voiceId, text)
}

/** @deprecated usar speakRemote */
export async function speakNeural(
  voiceId: string,
  text: string,
): Promise<string> {
  return speakRemote('neural', voiceId, text)
}
