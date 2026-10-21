import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_SAMPLE,
  fetchNeuralVoices,
  fetchPiperVoices,
  fetchVoicePrefs,
  saveVoicePrefs,
  ttsApiAvailable,
} from '../voices/api'
import { clampSpeechRate, DEFAULT_SPEECH_RATE } from '../voices/rate'
import type {
  NeuralVoice,
  PiperVoiceInfo,
  VoicePrefs,
  VoiceSource,
} from '../voices/types'

const LOCAL_PREFS_KEY = 'lectura-fiel:voice-prefs'

function normalizePrefs(prefs: VoicePrefs): VoicePrefs {
  return {
    ...prefs,
    rate: clampSpeechRate(prefs.rate ?? DEFAULT_SPEECH_RATE),
  }
}

function readLocalPrefs(): VoicePrefs {
  try {
    const raw = localStorage.getItem(LOCAL_PREFS_KEY)
    if (!raw) {
      return {
        source: 'windows',
        voiceId: null,
        rate: DEFAULT_SPEECH_RATE,
        firstRunDone: false,
      }
    }
    return normalizePrefs(JSON.parse(raw) as VoicePrefs)
  } catch {
    return {
      source: 'windows',
      voiceId: null,
      rate: DEFAULT_SPEECH_RATE,
      firstRunDone: false,
    }
  }
}

function writeLocalPrefs(prefs: VoicePrefs) {
  try {
    localStorage.setItem(
      LOCAL_PREFS_KEY,
      JSON.stringify(normalizePrefs(prefs)),
    )
  } catch {
    /* ignore */
  }
}

export function useVoiceSettings() {
  const [ready, setReady] = useState(false)
  const [apiOk, setApiOk] = useState(false)
  const [prefs, setPrefs] = useState<VoicePrefs>(readLocalPrefs)
  const [neuralVoices, setNeuralVoices] = useState<NeuralVoice[]>([])
  const [piperVoices, setPiperVoices] = useState<PiperVoiceInfo[]>([])
  const [sampleText, setSampleText] = useState(DEFAULT_SAMPLE)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setError(null)
    const available = await ttsApiAvailable()
    setApiOk(available)

    if (available) {
      try {
        const [prefsRes, neural, piper] = await Promise.all([
          fetchVoicePrefs(),
          fetchNeuralVoices(),
          fetchPiperVoices(),
        ])
        const merged = normalizePrefs({
          ...prefsRes.prefs,
          rate: prefsRes.prefs.rate ?? readLocalPrefs().rate,
        })
        setPrefs(merged)
        writeLocalPrefs(merged)
        setSampleText(
          prefsRes.sampleText || neural.sampleText || DEFAULT_SAMPLE,
        )
        setNeuralVoices(neural.voices)
        setPiperVoices(piper.voices)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error cargando voces')
        setPrefs(readLocalPrefs())
      }
    } else {
      setPrefs(readLocalPrefs())
      setNeuralVoices([])
      setPiperVoices([])
    }
    setReady(true)
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const save = useCallback(
    async (source: VoiceSource, voiceId: string, rate?: number) => {
      const nextRate = clampSpeechRate(rate ?? prefs.rate ?? DEFAULT_SPEECH_RATE)
      const next: VoicePrefs = {
        source,
        voiceId,
        rate: nextRate,
        firstRunDone: true,
      }
      if (apiOk) {
        const saved = normalizePrefs(
          await saveVoicePrefs({ source, voiceId, rate: nextRate }),
        )
        setPrefs(saved)
        writeLocalPrefs(saved)
        return saved
      }
      writeLocalPrefs(next)
      setPrefs(next)
      return next
    },
    [apiOk, prefs.rate],
  )

  const setRate = useCallback(
    async (rate: number) => {
      const nextRate = clampSpeechRate(rate)
      const next: VoicePrefs = normalizePrefs({ ...prefs, rate: nextRate })
      setPrefs(next)
      writeLocalPrefs(next)
      if (apiOk) {
        try {
          const saved = normalizePrefs(
            await saveVoicePrefs({
              source: prefs.source ?? undefined,
              voiceId: prefs.voiceId,
              rate: nextRate,
            }),
          )
          setPrefs(saved)
          writeLocalPrefs(saved)
        } catch {
          /* local already saved */
        }
      }
    },
    [apiOk, prefs],
  )

  return {
    ready,
    apiOk,
    prefs,
    neuralVoices,
    piperVoices,
    sampleText,
    setSampleText,
    error,
    save,
    setRate,
    reload,
  }
}
