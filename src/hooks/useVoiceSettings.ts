import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_SAMPLE,
  fetchNeuralVoices,
  fetchPiperVoices,
  fetchVoicePrefs,
  saveVoicePrefs,
  ttsApiAvailable,
} from '../voices/api'
import type {
  NeuralVoice,
  PiperVoiceInfo,
  VoicePrefs,
  VoiceSource,
} from '../voices/types'

const LOCAL_PREFS_KEY = 'lectura-fiel:voice-prefs'

function readLocalPrefs(): VoicePrefs {
  try {
    const raw = localStorage.getItem(LOCAL_PREFS_KEY)
    if (!raw) return { source: 'windows', voiceId: null, firstRunDone: false }
    return JSON.parse(raw) as VoicePrefs
  } catch {
    return { source: 'windows', voiceId: null, firstRunDone: false }
  }
}

function writeLocalPrefs(prefs: VoicePrefs) {
  try {
    localStorage.setItem(LOCAL_PREFS_KEY, JSON.stringify(prefs))
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
        setPrefs(prefsRes.prefs)
        writeLocalPrefs(prefsRes.prefs)
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
    async (source: VoiceSource, voiceId: string) => {
      const next: VoicePrefs = {
        source,
        voiceId,
        firstRunDone: true,
      }
      if (apiOk) {
        const saved = await saveVoicePrefs(source, voiceId)
        setPrefs(saved)
        writeLocalPrefs(saved)
        return saved
      }
      writeLocalPrefs(next)
      setPrefs(next)
      return next
    },
    [apiOk],
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
    reload,
  }
}
