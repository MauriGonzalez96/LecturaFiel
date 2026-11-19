import type {
  NeuralVoice,
  PiperVoiceInfo,
  VoicePrefs,
  VoiceSource,
} from './types'

export const DEFAULT_SAMPLE =
  'En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo.'

type SpeakResult = {
  path?: string
  base64?: string
  mime?: string
  error?: string
}

async function desktopKind(): Promise<'tauri' | 'other'> {
  try {
    const { getDesktopKind } = await import('../desktop/bridge')
    return getDesktopKind() === 'tauri' ? 'tauri' : 'other'
  } catch {
    return 'other'
  }
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  return invoke<T>(cmd, args)
}

export function formatVoiceError(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message
  if (typeof err === 'string' && err.trim()) return err
  if (err && typeof err === 'object') {
    const msg = (err as { message?: unknown }).message
    if (typeof msg === 'string' && msg.trim()) return msg
  }
  return fallback
}

function blobUrlFromBase64(base64: string, mime: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}

async function audioUrlFromSpeak(data: SpeakResult): Promise<string> {
  if (data.base64) {
    return blobUrlFromBase64(data.base64, data.mime || 'audio/mpeg')
  }
  if (data.path) {
    const { convertFileSrc } = await import('@tauri-apps/api/core')
    return convertFileSrc(data.path)
  }
  throw new Error(data.error || 'Error al generar audio')
}

export async function ttsApiAvailable(): Promise<boolean> {
  if ((await desktopKind()) === 'tauri') {
    try {
      const data = await tauriInvoke<{ tts?: boolean }>('health')
      return Boolean(data.tts)
    } catch {
      return false
    }
  }
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
  if ((await desktopKind()) === 'tauri') {
    const data = await tauriInvoke<{
      voices?: NeuralVoice[]
      sampleText?: string
    }>('tts_list_neural')
    return {
      voices: data.voices ?? [],
      sampleText: data.sampleText ?? DEFAULT_SAMPLE,
    }
  }
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
  if ((await desktopKind()) === 'tauri') {
    const data = await tauriInvoke<{
      voices?: PiperVoiceInfo[]
      sampleText?: string
    }>('tts_list_piper')
    return {
      voices: data.voices ?? [],
      sampleText: data.sampleText ?? DEFAULT_SAMPLE,
    }
  }
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
  if ((await desktopKind()) === 'tauri') {
    await tauriInvoke('tts_download_piper', { voiceId })
    return
  }
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
  if ((await desktopKind()) === 'tauri') {
    const data = await tauriInvoke<{ prefs: VoicePrefs; sampleText?: string }>(
      'tts_get_prefs',
    )
    return {
      prefs: data.prefs,
      sampleText: data.sampleText ?? DEFAULT_SAMPLE,
    }
  }
  const r = await fetch('/api/voices/prefs', { cache: 'no-store' })
  if (!r.ok) throw new Error('No se pudieron cargar preferencias de voz')
  const data = (await r.json()) as { prefs: VoicePrefs; sampleText?: string }
  return {
    prefs: data.prefs,
    sampleText: data.sampleText ?? DEFAULT_SAMPLE,
  }
}

export async function saveVoicePrefs(partial: {
  source?: VoiceSource
  voiceId?: string | null
  rate?: number
}): Promise<VoicePrefs> {
  if ((await desktopKind()) === 'tauri') {
    return tauriInvoke<VoicePrefs>('tts_save_prefs', { prefs: partial })
  }
  const r = await fetch('/api/voices/prefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  })
  if (!r.ok) throw new Error('No se pudo guardar la voz')
  const data = (await r.json()) as { prefs: VoicePrefs }
  return data.prefs
}

export async function previewVoice(
  source: 'neural' | 'piper',
  voiceId: string,
  text: string,
  rate?: number,
): Promise<string> {
  if ((await desktopKind()) === 'tauri') {
    const data = await tauriInvoke<SpeakResult>('tts_preview', {
      req: { source, voiceId, text, rate },
    })
    return audioUrlFromSpeak(data)
  }
  const r = await fetch('/api/voices/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, voiceId, text, rate }),
  })
  const data = (await r.json()) as { url?: string; error?: string }
  if (!r.ok || !data.url) throw new Error(data.error || 'Error al generar audio')
  return data.url
}

export async function speakRemote(
  source: 'neural' | 'piper',
  voiceId: string,
  text: string,
  rate?: number,
): Promise<string> {
  if ((await desktopKind()) === 'tauri') {
    const data = await tauriInvoke<SpeakResult>('tts_speak', {
      req: { source, voiceId, text, rate },
    })
    return audioUrlFromSpeak(data)
  }
  const r = await fetch('/api/voices/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, voiceId, text, rate }),
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
