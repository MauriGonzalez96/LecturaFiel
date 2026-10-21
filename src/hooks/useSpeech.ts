import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { speakRemote, ttsApiAvailable } from '../voices/api'
import type { VoicePrefs } from '../voices/types'
import { splitSpeechChunks } from './speechChunks'

export type SpeechStatus = 'idle' | 'speaking' | 'paused' | 'unsupported' | 'loading'

export type SpeakOptions = {
  /** Se llama cuando terminó todo el texto (todos los chunks), no si se detuvo. */
  onComplete?: () => void
}

const VOICE_KEY = 'lectura-fiel:voiceURI'
const LOCAL_PREFS_KEY = 'lectura-fiel:voice-prefs'

function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase()
  let score = 0
  if (v.lang.toLowerCase().startsWith('es')) score += 100
  if (v.lang.toLowerCase().startsWith('es-ar')) score += 25
  if (v.lang.toLowerCase().startsWith('es-mx')) score += 20
  if (v.lang.toLowerCase().startsWith('es-es')) score += 18
  if (/natural|neural|online|premium|enhanced|wavenet|studio/.test(name))
    score += 80
  if (/google/.test(name)) score += 40
  if (/microsoft/.test(name) && /online|natural/.test(name)) score += 50
  if (v.localService === false) score += 20
  if (/desktop|espeak/.test(name)) score -= 30
  return score
}

function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  preferredURI: string | null,
): SpeechSynthesisVoice | null {
  if (!voices.length) return null
  if (preferredURI) {
    const preferred = voices.find((v) => v.voiceURI === preferredURI)
    if (preferred) return preferred
  }
  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null
}

function readPrefs(): VoicePrefs {
  try {
    const raw = localStorage.getItem(LOCAL_PREFS_KEY)
    if (raw) return JSON.parse(raw) as VoicePrefs
  } catch {
    /* ignore */
  }
  return { source: 'windows', voiceId: null }
}

/**
 * Reproduce con voz Windows (SpeechSynthesis) o neural (API del exe).
 * Textos largos se parten en chunks y se encadenan.
 */
export function useSpeech() {
  const [status, setStatus] = useState<SpeechStatus>(() =>
    typeof window !== 'undefined' && 'speechSynthesis' in window
      ? 'idle'
      : 'unsupported',
  )
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceURI, setVoiceURIState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(VOICE_KEY)
    } catch {
      return null
    }
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const stopRequestedRef = useRef(false)
  const sessionRef = useRef(0)
  const pausedRef = useRef(false)
  const resumeGateRef = useRef<(() => void) | null>(null)

  const spanishVoices = useMemo(
    () =>
      voices
        .filter((v) => v.lang.toLowerCase().startsWith('es'))
        .sort((a, b) => scoreVoice(b) - scoreVoice(a)),
    [voices],
  )

  const selectedVoice = useMemo(
    () =>
      pickBestVoice(spanishVoices.length ? spanishVoices : voices, voiceURI),
    [spanishVoices, voices, voiceURI],
  )

  const setVoiceURI = useCallback((uri: string) => {
    setVoiceURIState(uri)
    try {
      localStorage.setItem(VOICE_KEY, uri)
    } catch {
      /* ignore */
    }
  }, [])

  const stop = useCallback(() => {
    stopRequestedRef.current = true
    sessionRef.current += 1
    pausedRef.current = false
    if (resumeGateRef.current) {
      resumeGateRef.current()
      resumeGateRef.current = null
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    utteranceRef.current = null
    setStatus('idle')
  }, [])

  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
      pausedRef.current = true
      setStatus('paused')
      return
    }
    if (!('speechSynthesis' in window)) return
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause()
      pausedRef.current = true
      setStatus('paused')
    }
  }, [])

  const resume = useCallback(() => {
    pausedRef.current = false
    if (resumeGateRef.current) {
      resumeGateRef.current()
      resumeGateRef.current = null
    }
    if (audioRef.current && audioRef.current.paused) {
      void audioRef.current.play()
      setStatus('speaking')
      return
    }
    if (!('speechSynthesis' in window)) return
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setStatus('speaking')
    }
  }, [])

  const waitIfPaused = useCallback(async () => {
    if (!pausedRef.current) return
    await new Promise<void>((resolve) => {
      resumeGateRef.current = resolve
    })
  }, [])

  const speakWindowsChunk = useCallback(
    (chunk: string, preferredURI: string | null, session: number) =>
      new Promise<void>((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
          reject(new Error('unsupported'))
          return
        }
        const u = new SpeechSynthesisUtterance(chunk)
        const voice = pickBestVoice(
          window.speechSynthesis
            .getVoices()
            .filter((v) => v.lang.toLowerCase().startsWith('es')),
          preferredURI,
        )
        if (voice) {
          u.voice = voice
          u.lang = voice.lang
        } else {
          u.lang = 'es-ES'
        }
        u.rate = 0.92
        u.onstart = () => {
          if (session === sessionRef.current) setStatus('speaking')
        }
        u.onend = () => resolve()
        u.onerror = () => resolve()
        utteranceRef.current = u
        window.speechSynthesis.speak(u)
      }),
    [],
  )

  const speakRemoteChunk = useCallback(
    async (
      chunk: string,
      source: 'neural' | 'piper',
      voiceId: string,
      session: number,
    ) => {
      setStatus('loading')
      const url = await speakRemote(source, voiceId, chunk)
      if (session !== sessionRef.current || stopRequestedRef.current) return
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onplay = () => {
          if (session === sessionRef.current) setStatus('speaking')
        }
        audio.onended = () => resolve()
        audio.onerror = () => reject(new Error('audio error'))
        void audio.play().catch(reject)
      })
    },
    [],
  )

  const speak = useCallback(
    async (text: string, options?: SpeakOptions) => {
      const clean = text.replace(/\s+/g, ' ').trim()
      if (!clean) return

      stopRequestedRef.current = false
      pausedRef.current = false
      sessionRef.current += 1
      const session = sessionRef.current

      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }

      const chunks = splitSpeechChunks(clean)
      const prefs = readPrefs()
      const apiOk = await ttsApiAvailable()
      const useRemote =
        (prefs.source === 'neural' || prefs.source === 'piper') &&
        Boolean(prefs.voiceId) &&
        apiOk

      const uri =
        prefs.source === 'windows' && prefs.voiceId
          ? prefs.voiceId
          : voiceURI

      try {
        for (const chunk of chunks) {
          if (stopRequestedRef.current || session !== sessionRef.current) return
          await waitIfPaused()
          if (stopRequestedRef.current || session !== sessionRef.current) return

          if (useRemote && prefs.voiceId) {
            try {
              await speakRemoteChunk(
                chunk,
                prefs.source as 'neural' | 'piper',
                prefs.voiceId,
                session,
              )
            } catch (err) {
              console.error(err)
              await speakWindowsChunk(chunk, uri, session)
            }
          } else {
            await speakWindowsChunk(chunk, uri, session)
          }
        }

        if (stopRequestedRef.current || session !== sessionRef.current) return
        setStatus('idle')
        options?.onComplete?.()
      } catch {
        if (session === sessionRef.current) setStatus('idle')
      }
    },
    [speakRemoteChunk, speakWindowsChunk, voiceURI, waitIfPaused],
  )

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const refresh = () => setVoices(window.speechSynthesis.getVoices())
    refresh()
    window.speechSynthesis.addEventListener('voiceschanged', refresh)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', refresh)
      window.speechSynthesis.cancel()
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  return {
    status,
    speak,
    stop,
    pause,
    resume,
    voices: spanishVoices.length ? spanishVoices : voices,
    selectedVoice,
    voiceURI: selectedVoice?.voiceURI ?? voiceURI,
    setVoiceURI,
  }
}
