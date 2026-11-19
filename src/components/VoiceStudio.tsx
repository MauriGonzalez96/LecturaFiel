import { useEffect, useMemo, useRef, useState } from 'react'
import { useSpeech } from '../hooks/useSpeech'
import { useVoiceSettings } from '../hooks/useVoiceSettings'
import {
  downloadPiperVoice,
  formatVoiceError,
  previewVoice,
} from '../voices/api'
import {
  clampSpeechRate,
  DEFAULT_SPEECH_RATE,
} from '../voices/rate'
import type { VoiceSource } from '../voices/types'
import { SpeechRateControl } from './SpeechRateControl'

interface Props {
  onClose?: () => void
  /** Variante embebida en modal de ajustes. */
  compact?: boolean
}

/**
 * Voces globales: una sola elección para libro, original y resúmenes IA.
 */
export function VoiceStudio({ onClose, compact = false }: Props) {
  const {
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
  } = useVoiceSettings()

  const {
    voices: windowsVoices,
    speak,
    stop,
    status,
    setVoiceURI,
  } = useSpeech()

  const [tab, setTab] = useState<VoiceSource>(prefs.source ?? 'piper')
  const [selectedId, setSelectedId] = useState<string | null>(prefs.voiceId)
  const [rate, setRateLocal] = useState(() =>
    clampSpeechRate(prefs.rate ?? DEFAULT_SPEECH_RATE),
  )
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (prefs.source) setTab(prefs.source)
    if (prefs.voiceId) setSelectedId(prefs.voiceId)
    setRateLocal(clampSpeechRate(prefs.rate ?? DEFAULT_SPEECH_RATE))
  }, [prefs.source, prefs.voiceId, prefs.rate])

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  const windowsList = useMemo(
    () =>
      windowsVoices.map((v) => ({
        id: v.voiceURI,
        name: v.name,
        locale: v.lang,
        natural: /natural|neural|online|premium|google/i.test(v.name),
        installed: true,
      })),
    [windowsVoices],
  )

  function stopAll() {
    stop()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
  }

  async function playUrl(url: string, doneMsg: string) {
    if (url.startsWith('blob:')) blobUrlRef.current = url
    const audio = new Audio(url)
    audioRef.current = audio
    audio.onended = () => setMsg(doneMsg)
    await audio.play()
  }

  async function listenSample() {
    if (!selectedId) {
      setMsg('Elegí una voz de la lista.')
      return
    }
    setMsg(null)
    setBusy(true)
    stopAll()
    try {
      if (tab === 'windows') {
        setVoiceURI(selectedId)
        void speak(sampleText)
        setMsg('Reproduciendo muestra…')
        return
      }
      if (!apiOk) {
        setMsg('Piper y Neural solo están disponibles en Lektor.exe.')
        return
      }
      if (tab === 'piper') {
        const info = piperVoices.find((v) => v.id === selectedId)
        if (info && !info.installed) {
          setMsg('Descargando modelo Piper…')
          await downloadPiperVoice(selectedId)
          await reload()
        }
        setMsg('Sintetizando…')
        const url = await previewVoice('piper', selectedId, sampleText, rate)
        await playUrl(url, 'Muestra terminada.')
        setMsg('Reproduciendo Piper…')
        return
      }
      setMsg('Generando muestra neural…')
      const url = await previewVoice('neural', selectedId, sampleText, rate)
      await playUrl(url, 'Muestra terminada.')
      setMsg('Reproduciendo neural…')
    } catch (e) {
      setMsg(formatVoiceError(e, 'No se pudo reproducir'))
    } finally {
      setBusy(false)
    }
  }

  async function applyVoice() {
    if (!selectedId) {
      setMsg('Elegí una voz de la lista.')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      if (tab === 'piper' && apiOk) {
        const info = piperVoices.find((v) => v.id === selectedId)
        if (info && !info.installed) {
          setMsg('Descargando modelo…')
          await downloadPiperVoice(selectedId)
          await reload()
        }
      }
      await save(tab, selectedId, rate)
      if (tab === 'windows') setVoiceURI(selectedId)
      setMsg('Voz guardada para todo lo que lee la app.')
    } catch (e) {
      setMsg(formatVoiceError(e, 'No se pudo guardar'))
    } finally {
      setBusy(false)
    }
  }

  const rawList =
    tab === 'windows'
      ? windowsList
      : tab === 'piper'
        ? piperVoices.map((v) => ({
            id: v.id,
            name: v.name,
            locale: v.locale,
            natural: true,
            installed: v.installed,
            quality: v.quality,
          }))
        : neuralVoices.map((v) => ({
            id: v.id,
            name: v.name,
            locale: v.locale,
            natural: true,
            installed: true,
            gender: v.gender,
          }))

  const list = useMemo(() => {
    const q = filter.trim().toLowerCase()
    const filtered = q
      ? rawList.filter(
          (v) =>
            v.name.toLowerCase().includes(q) ||
            v.locale.toLowerCase().includes(q) ||
            v.id.toLowerCase().includes(q),
        )
      : rawList

    if (tab !== 'neural') return filtered

    // Español primero para neural.
    return [...filtered].sort((a, b) => {
      const ae = /^es/i.test(a.locale) || /spanish|español/i.test(a.name) ? 0 : 1
      const be = /^es/i.test(b.locale) || /spanish|español/i.test(b.name) ? 0 : 1
      if (ae !== be) return ae - be
      return a.name.localeCompare(b.name, 'es')
    })
  }, [filter, rawList, tab])

  function selectTab(next: VoiceSource) {
    stopAll()
    setTab(next)
    setFilter('')
    if (next === 'piper') {
      setSelectedId(
        prefs.source === 'piper' ? prefs.voiceId : piperVoices[0]?.id ?? null,
      )
    } else if (next === 'windows') {
      setSelectedId(
        prefs.source === 'windows'
          ? prefs.voiceId
          : windowsList[0]?.id ?? null,
      )
    } else {
      setSelectedId(
        prefs.source === 'neural'
          ? prefs.voiceId
          : neuralVoices[0]?.id ?? null,
      )
      if (!apiOk) void reload()
    }
  }

  return (
    <div className={`voice-studio${compact ? ' voice-studio-compact' : ''}`}>
      <div className="voice-studio-head">
        <div>
          <h2>Voces</h2>
          <p className="voice-studio-lede">
            Una voz para el libro, el original y los resúmenes IA.
          </p>
        </div>
        {onClose && (
          <button type="button" className="btn ghost" onClick={onClose}>
            Cerrar
          </button>
        )}
      </div>

      {!ready && <p className="hint">Cargando voces…</p>}
      {error && <p className="upload-error">{error}</p>}

      {prefs.source && prefs.voiceId && (
        <p className="voice-active-chip">
          Activa: <strong>{prefs.source}</strong> · {prefs.voiceId} ·{' '}
          {clampSpeechRate(prefs.rate ?? DEFAULT_SPEECH_RATE).toFixed(2)}×
        </p>
      )}

      <div className="voice-engine-tabs" role="tablist" aria-label="Motor de voz">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'piper'}
          className={tab === 'piper' ? 'voice-engine active' : 'voice-engine'}
          onClick={() => selectTab('piper')}
        >
          Piper {apiOk ? `(${piperVoices.length})` : ''}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'windows'}
          className={tab === 'windows' ? 'voice-engine active' : 'voice-engine'}
          onClick={() => selectTab('windows')}
        >
          Windows ({windowsList.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'neural'}
          className={tab === 'neural' ? 'voice-engine active' : 'voice-engine'}
          onClick={() => selectTab('neural')}
        >
          Neural {apiOk ? `(${neuralVoices.length})` : ''}
        </button>
      </div>

      {tab !== 'windows' && !apiOk && (
        <p className="hint">
          Piper y Neural requieren la app de escritorio (
          <strong>Lektor.exe</strong>).
        </p>
      )}

      <div className="voice-controls-row">
        <label className="voice-filter">
          Buscar
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={
              tab === 'neural' ? 'ej. Argentina, Marcelo…' : 'Nombre o idioma'
            }
          />
        </label>
        <SpeechRateControl
          rate={rate}
          onChange={(next) => {
            setRateLocal(next)
            void setRate(next)
          }}
          disabled={busy}
          compact
        />
      </div>

      <label className="block voice-sample">
        Texto de muestra
        <textarea
          rows={compact ? 2 : 3}
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
        />
      </label>

      <div className="voice-list" role="listbox" aria-label="Lista de voces">
        {list.length === 0 ? (
          <p className="hint">No hay voces con ese filtro.</p>
        ) : (
          list.map((v) => (
            <button
              key={v.id}
              type="button"
              role="option"
              aria-selected={selectedId === v.id}
              className={`voice-item${selectedId === v.id ? ' selected' : ''}`}
              onClick={() => setSelectedId(v.id)}
              onDoubleClick={() => void listenSample()}
            >
              <span className="voice-item-name">{v.name}</span>
              <span className="voice-item-meta">
                {v.locale}
                {'quality' in v && v.quality ? ` · ${v.quality}` : ''}
                {'installed' in v && tab === 'piper'
                  ? v.installed
                    ? ' · lista'
                    : ' · descarga'
                  : ''}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="voice-actions">
        <button
          type="button"
          className="btn ghost"
          onClick={() => void listenSample()}
          disabled={busy || !selectedId}
        >
          Escuchar
        </button>
        <button type="button" className="btn ghost" onClick={stopAll}>
          Detener
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => void applyVoice()}
          disabled={busy || !selectedId}
        >
          Usar esta voz
        </button>
      </div>

      {msg && <p className="voice-msg">{msg}</p>}
      {busy && status === 'loading' && <p className="hint">Procesando…</p>}
    </div>
  )
}
