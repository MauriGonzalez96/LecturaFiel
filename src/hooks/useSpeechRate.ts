import { useCallback, useEffect, useState } from 'react'
import { saveVoicePrefs, ttsApiAvailable } from '../voices/api'
import { clampSpeechRate, DEFAULT_SPEECH_RATE } from '../voices/rate'
import type { VoicePrefs } from '../voices/types'

const LOCAL_PREFS_KEY = 'lectura-fiel:voice-prefs'

function readRate(): number {
  try {
    const raw = localStorage.getItem(LOCAL_PREFS_KEY)
    if (!raw) return DEFAULT_SPEECH_RATE
    const prefs = JSON.parse(raw) as VoicePrefs
    return clampSpeechRate(prefs.rate ?? DEFAULT_SPEECH_RATE)
  } catch {
    return DEFAULT_SPEECH_RATE
  }
}

function writeRateLocal(rate: number) {
  try {
    const raw = localStorage.getItem(LOCAL_PREFS_KEY)
    const prefs = raw
      ? (JSON.parse(raw) as VoicePrefs)
      : ({ source: 'windows', voiceId: null } as VoicePrefs)
    localStorage.setItem(
      LOCAL_PREFS_KEY,
      JSON.stringify({ ...prefs, rate: clampSpeechRate(rate) }),
    )
  } catch {
    /* ignore */
  }
}

/** Solo velocidad (para la barra de audio, sin recargar listas de voces). */
export function useSpeechRate() {
  const [rate, setRateState] = useState(readRate)

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_PREFS_KEY) setRateState(readRate())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setRate = useCallback((next: number) => {
    const value = clampSpeechRate(next)
    setRateState(value)
    writeRateLocal(value)
    void (async () => {
      if (!(await ttsApiAvailable())) return
      try {
        const raw = localStorage.getItem(LOCAL_PREFS_KEY)
        const prefs = raw ? (JSON.parse(raw) as VoicePrefs) : null
        await saveVoicePrefs({
          source: prefs?.source ?? undefined,
          voiceId: prefs?.voiceId,
          rate: value,
        })
      } catch {
        /* local ya guardado */
      }
    })()
  }, [])

  return { rate, setRate }
}
