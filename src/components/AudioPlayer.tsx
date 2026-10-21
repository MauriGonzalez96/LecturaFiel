import { useEffect, useId, useRef, useState } from 'react'
import { useSpeech, type SpeechStatus } from '../hooks/useSpeech'
import { useSpeechRate } from '../hooks/useSpeechRate'
import { SpeechRateControl } from './SpeechRateControl'

interface Props {
  adaptedText: string
  originalText: string
  /** Cambia al pasar de página/capítulo (dispara auto-continuación). */
  chapterKey?: string | number
  /** Etiqueta del capítulo/página actual (para el aviso). */
  currentLabel?: string
  /** Hay página/capítulo siguiente. */
  hasNextChapter?: boolean
  /** Título o etiqueta del siguiente (para preguntar). */
  nextChapterLabel?: string
  /** Avanzar y devolver true si hubo avance. */
  onAdvanceChapter?: () => boolean
  onOpenVoices?: () => void
}

type Source = 'adapted' | 'original'
type PromptKind = 'next' | 'finished' | null

const PROMPT_KEY = 'lectura-fiel:ask-continue'

function readAskContinue(): boolean {
  try {
    const raw = localStorage.getItem(PROMPT_KEY)
    if (raw === null) return true
    return raw === '1'
  } catch {
    return true
  }
}

export function AudioPlayer({
  adaptedText,
  originalText,
  chapterKey,
  currentLabel,
  hasNextChapter = false,
  nextChapterLabel,
  onAdvanceChapter,
  onOpenVoices,
}: Props) {
  const { status, speak, stop, pause, resume } = useSpeech()
  const { rate, setRate } = useSpeechRate()
  const [askContinue, setAskContinue] = useState(readAskContinue)
  const [source, setSource] = useState<Source>('adapted')
  const [prompt, setPrompt] = useState<PromptKind>(null)
  const continueRef = useRef(false)
  const prevChapterRef = useRef(chapterKey)
  const titleId = useId()

  const askRef = useRef(askContinue)
  const hasNextRef = useRef(hasNextChapter)
  const advanceFnRef = useRef(onAdvanceChapter)
  const adaptedRef = useRef(adaptedText)
  const originalRef = useRef(originalText)
  const sourceRef = useRef(source)
  const speakRef = useRef(speak)

  askRef.current = askContinue
  hasNextRef.current = hasNextChapter
  advanceFnRef.current = onAdvanceChapter
  adaptedRef.current = adaptedText
  originalRef.current = originalText
  sourceRef.current = source
  speakRef.current = speak

  useEffect(() => {
    try {
      localStorage.setItem(PROMPT_KEY, askContinue ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [askContinue])

  function onPlaybackComplete() {
    if (!askRef.current) return
    if (hasNextRef.current && advanceFnRef.current) {
      setPrompt('next')
      return
    }
    setPrompt('finished')
  }

  // Tras confirmar y avanzar, seguir leyendo el texto nuevo.
  useEffect(() => {
    if (prevChapterRef.current === chapterKey) return
    prevChapterRef.current = chapterKey
    if (!continueRef.current) return
    continueRef.current = false
    const text =
      sourceRef.current === 'adapted'
        ? adaptedRef.current
        : originalRef.current
    if (!text.trim()) return
    void speakRef.current(text, { onComplete: onPlaybackComplete })
  }, [chapterKey, adaptedText, originalText])

  function acceptContinue() {
    setPrompt(null)
    if (!advanceFnRef.current) return
    continueRef.current = true
    const advanced = advanceFnRef.current()
    if (!advanced) continueRef.current = false
  }

  function declineContinue() {
    setPrompt(null)
    continueRef.current = false
  }

  if (status === 'unsupported') {
    return (
      <div className="audio-bar muted">
        Tu navegador no soporta lectura en voz alta.
      </div>
    )
  }

  function play(next: Source) {
    setSource(next)
    continueRef.current = false
    setPrompt(null)
    const text = next === 'adapted' ? adaptedText : originalText
    void speak(text, { onComplete: onPlaybackComplete })
  }

  function handleStop() {
    continueRef.current = false
    setPrompt(null)
    stop()
  }

  const where =
    currentLabel?.trim() ||
    (hasNextChapter ? 'este capítulo' : 'el último capítulo')

  return (
    <>
      <div className="audio-bar" role="group" aria-label="Reproducir audio">
        <div className="audio-controls">
          {status === 'paused' ? (
            <button
              type="button"
              className="icon-btn primary"
              onClick={resume}
              title="Reanudar"
              aria-label="Reanudar"
            >
              <IconPlay />
            </button>
          ) : status === 'speaking' || status === 'loading' ? (
            <button
              type="button"
              className="icon-btn"
              onClick={pause}
              title="Pausa"
              aria-label="Pausa"
              disabled={status === 'loading'}
            >
              <IconPause />
            </button>
          ) : (
            <button
              type="button"
              className="icon-btn primary"
              onClick={() => play('adapted')}
              disabled={!adaptedText.trim()}
              title="Reproducir texto adaptado"
              aria-label="Reproducir adaptado"
            >
              <IconPlay />
            </button>
          )}

          <button
            type="button"
            className="icon-btn"
            onClick={handleStop}
            disabled={status === 'idle' && !prompt}
            title="Detener"
            aria-label="Detener"
          >
            <IconStop />
          </button>

          <button
            type="button"
            className="btn ghost audio-src"
            onClick={() => play('adapted')}
            disabled={!adaptedText.trim() || status === 'loading'}
            title="Escuchar versión adaptada"
          >
            Adaptado
          </button>
          <button
            type="button"
            className="btn ghost audio-src"
            onClick={() => play('original')}
            disabled={!originalText.trim() || status === 'loading'}
            title="Escuchar original"
          >
            Original
          </button>

          {onOpenVoices && (
            <button
              type="button"
              className="btn ghost audio-src"
              onClick={onOpenVoices}
              title="Elegir y probar voces"
            >
              Voces…
            </button>
          )}

          <label
            className="audio-advance"
            title="Al terminar el audio, avisar y preguntar si seguimos"
          >
            <input
              type="checkbox"
              checked={askContinue}
              onChange={(e) => setAskContinue(e.target.checked)}
            />
            Avisar al terminar
          </label>
        </div>

        <SpeechRateControl
          rate={rate}
          onChange={setRate}
          compact
          disabled={status === 'loading'}
        />

        <StatusDot status={status} />
      </div>

      {prompt === 'next' && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={declineContinue}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId}>Terminaste {where}</h2>
            <p>
              {nextChapterLabel
                ? `¿Continuamos con «${nextChapterLabel}»?`
                : '¿Continuamos con el siguiente?'}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn ghost"
                onClick={declineContinue}
              >
                Quedarme acá
              </button>
              <button
                type="button"
                className="btn primary"
                onClick={acceptContinue}
                autoFocus
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {prompt === 'finished' && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={declineContinue}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={titleId}>Fin de la lectura</h2>
            <p>
              Terminaste {where}
              {!hasNextChapter ? ' — no hay más páginas o capítulos.' : '.'}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn primary"
                onClick={declineContinue}
                autoFocus
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function StatusDot({ status }: { status: SpeechStatus }) {
  if (status === 'idle') return null
  const label =
    status === 'loading'
      ? 'Preparando voz…'
      : status === 'speaking'
        ? 'Reproduciendo…'
        : 'En pausa'
  return (
    <span className={`audio-status status-${status}`} aria-live="polite">
      {label}
    </span>
  )
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M8 5v14l11-7z" />
    </svg>
  )
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M6 5h4v14H6zm8 0h4v14h-4z" />
    </svg>
  )
}

function IconStop() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M6 6h12v12H6z" />
    </svg>
  )
}
