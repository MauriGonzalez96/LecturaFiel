import { useEffect, useMemo, useRef, useState } from 'react'
import { useSpeech } from '../hooks/useSpeech'
import { useVoiceSettings } from '../hooks/useVoiceSettings'
import { downloadPiperVoice, previewVoice } from '../voices/api'
import {
  clampSpeechRate,
  DEFAULT_SPEECH_RATE,
} from '../voices/rate'
import type { VoiceSource } from '../voices/types'
import { SpeechRateControl } from './SpeechRateControl'

interface Props {
  onClose?: () => void
}

/**
 * Estudio de voces: Windows, Piper (local) y Edge neural (online).
 */
export function VoiceStudio({ onClose }: Props) {
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
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (prefs.source) setTab(prefs.source)
    if (prefs.voiceId) setSelectedId(prefs.voiceId)
    setRateLocal(clampSpeechRate(prefs.rate ?? DEFAULT_SPEECH_RATE))
  }, [prefs.source, prefs.voiceId, prefs.rate])

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
        setMsg('Reproduciendo muestra (Windows)…')
        return
      }
      if (!apiOk) {
        setMsg(
          'Piper y neurales solo están en el .exe (o desktop\\run_dev.bat).',
        )
        return
      }
      if (tab === 'piper') {
        const info = piperVoices.find((v) => v.id === selectedId)
        if (info && !info.installed) {
          setMsg('Descargando modelo Piper (solo la primera vez)…')
          await downloadPiperVoice(selectedId)
          await reload()
        }
        setMsg('Sintetizando con Piper…')
        const url = await previewVoice('piper', selectedId, sampleText, rate)
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => setMsg('Muestra terminada.')
        await audio.play()
        setMsg('Reproduciendo Piper…')
        return
      }
      setMsg('Generando muestra neural (internet)…')
      const url = await previewVoice('neural', selectedId, sampleText, rate)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => setMsg('Muestra terminada.')
      await audio.play()
      setMsg('Reproduciendo neural…')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo reproducir')
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
          setMsg('Descargando modelo antes de guardar…')
          await downloadPiperVoice(selectedId)
          await reload()
        }
      }
      await save(tab, selectedId, rate)
      if (tab === 'windows') setVoiceURI(selectedId)
      setMsg('Voz y velocidad guardadas. El lector las usará a partir de ahora.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  const list =
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

  return (
    <div className="voice-studio">
      <div className="voice-studio-head">
        <div>
          <h2>Voces</h2>
          <p className="voice-studio-lede">
            Elegí Windows, Piper (modelo local offline) o Neural Edge (online).
            Escuchá una muestra y guardá la que más te guste.
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

      {prefs.defaultApplied && prefs.source === 'piper' && (
        <p className="voice-banner">
          Primera apertura: se descargó y configuró{' '}
          <strong>es_AR-daniela-high</strong> (Piper, Argentina). Podés cambiarla
          cuando quieras.
        </p>
      )}

      <div className="tabs" role="tablist">
        <button
          type="button"
          className={tab === 'piper' ? 'tab active' : 'tab'}
          onClick={() => {
            stopAll()
            setTab('piper')
            setSelectedId(
              prefs.source === 'piper'
                ? prefs.voiceId
                : piperVoices[0]?.id ?? null,
            )
          }}
        >
          Piper ({apiOk ? piperVoices.length : 'exe'})
        </button>
        <button
          type="button"
          className={tab === 'windows' ? 'tab active' : 'tab'}
          onClick={() => {
            stopAll()
            setTab('windows')
            setSelectedId(
              prefs.source === 'windows'
                ? prefs.voiceId
                : windowsList[0]?.id ?? null,
            )
          }}
        >
          Windows ({windowsList.length})
        </button>
        <button
          type="button"
          className={tab === 'neural' ? 'tab active' : 'tab'}
          onClick={() => {
            stopAll()
            setTab('neural')
            setSelectedId(
              prefs.source === 'neural'
                ? prefs.voiceId
                : neuralVoices[0]?.id ?? null,
            )
            if (!apiOk) void reload()
          }}
        >
          Neural ({apiOk ? neuralVoices.length : 'exe'})
        </button>
      </div>

      {tab !== 'windows' && !apiOk && (
        <p className="hint">
          Piper y Neural requieren <strong>LecturaFiel.exe</strong> o{' '}
          <code>desktop\run_dev.bat</code>. Piper descarga el modelo una vez; Neural
          usa internet en cada lectura.
        </p>
      )}

      <label className="block">
        Texto de muestra
        <textarea
          rows={3}
          value={sampleText}
          onChange={(e) => setSampleText(e.target.value)}
        />
      </label>

      <SpeechRateControl
        rate={rate}
        onChange={(next) => {
          setRateLocal(next)
          void setRate(next)
        }}
        disabled={busy}
      />

      <div className="voice-list" role="listbox" aria-label="Lista de voces">
        {list.length === 0 ? (
          <p className="hint">No hay voces en esta categoría.</p>
        ) : (
          list.map((v) => (
            <button
              key={v.id}
              type="button"
              role="option"
              aria-selected={selectedId === v.id}
              className={`voice-item${selectedId === v.id ? ' selected' : ''}`}
              onClick={() => setSelectedId(v.id)}
            >
              <span className="voice-item-name">{v.name}</span>
              <span className="voice-item-meta">
                {v.locale}
                {'quality' in v && v.quality ? ` · ${v.quality}` : ''}
                {'natural' in v && v.natural ? ' · natural' : ''}
                {'installed' in v && tab === 'piper'
                  ? v.installed
                    ? ' · instalada'
                    : ' · pendiente de descarga'
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
          ▶ Escuchar muestra
        </button>
        <button type="button" className="btn ghost" onClick={stopAll}>
          ⏹ Detener
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
      {busy && status === 'loading' && (
        <p className="hint">Procesando…</p>
      )}

      {prefs.source && prefs.voiceId && (
        <p className="hint">
          Voz activa: <strong>{prefs.source}</strong> · {prefs.voiceId} ·{' '}
          {clampSpeechRate(prefs.rate ?? DEFAULT_SPEECH_RATE).toFixed(2)}×
        </p>
      )}
    </div>
  )
}
