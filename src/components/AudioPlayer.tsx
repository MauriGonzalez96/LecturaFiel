import { useEffect, useId, useRef, useState } from 'react'
import { splitSentences } from '../engine/sentences'
import { useSpeech, type SpeechStatus } from '../hooks/useSpeech'
import { useSpeechRate } from '../hooks/useSpeechRate'
import { SpeechRateControl } from './SpeechRateControl'

interface Props {
  adaptedText: string
  originalText: string
  /** Resumen IA del capítulo (si existe). */
  summaryText?: string
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
  /** Oración guardada (0 = inicio). */
  resumeSentenceIndex?: number
  /** Persistir oración actual (audio / pausa). */
  onSentenceProgress?: (sentenceIndex: number) => void
  /** Incrementa al colocar el cursor a mano → si hay audio, salta ahí. */
  seekNonce?: number
  /** Incrementa para forzar reproducción del resumen IA. */
  listenSummaryNonce?: number
  /**
   * Estado del resumen del capítulo actual (para encadenar sin hablar
   * el resumen viejo mientras carga el nuevo).
   */
  summaryStatus?: 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured'
  /** Se llama al terminar de escuchar un resumen. */
  onSummaryHeard?: () => void
  /**
   * En cadena: si el capítulo nuevo no tiene resumen, pedí generarlo.
   * El player espera `summaryStatus === 'loading' → ready`.
   */
  onGenerateSummaryForChain?: () => void
}

type Source = 'adapted' | 'original' | 'summary'
type PromptKind = 'next' | 'finished' | null

const PROMPT_KEY = 'lectura-fiel:ask-continue'
const CHAIN_KEY = 'lectura-fiel:chain-summaries'

function readAskContinue(): boolean {
  try {
    const raw = localStorage.getItem(PROMPT_KEY)
    if (raw === null) return true
    return raw === '1'
  } catch {
    return true
  }
}

function readChainSummaries(): boolean {
  try {
    return localStorage.getItem(CHAIN_KEY) === '1'
  } catch {
    return false
  }
}

export function AudioPlayer({
  adaptedText,
  originalText,
  summaryText = '',
  chapterKey,
  currentLabel,
  hasNextChapter = false,
  nextChapterLabel,
  onAdvanceChapter,
  onOpenVoices,
  resumeSentenceIndex = 0,
  onSentenceProgress,
  seekNonce = 0,
  listenSummaryNonce = 0,
  summaryStatus = 'idle',
  onSummaryHeard,
  onGenerateSummaryForChain,
}: Props) {
  const { status, speak, stop, pause, resume } = useSpeech()
  const { rate, setRate } = useSpeechRate()
  const [askContinue, setAskContinue] = useState(readAskContinue)
  const [chainSummaries, setChainSummaries] = useState(readChainSummaries)
  const [source, setSource] = useState<Source>('adapted')
  const [prompt, setPrompt] = useState<PromptKind>(null)
  const continueRef = useRef(false)
  const pendingSummaryChainRef = useRef(false)
  const prevChapterRef = useRef(chapterKey)
  const lastSentenceRef = useRef(resumeSentenceIndex)
  const titleId = useId()

  const askRef = useRef(askContinue)
  const chainRef = useRef(chainSummaries)
  const hasNextRef = useRef(hasNextChapter)
  const advanceFnRef = useRef(onAdvanceChapter)
  const adaptedRef = useRef(adaptedText)
  const originalRef = useRef(originalText)
  const summaryRef = useRef(summaryText)
  const summaryStatusRef = useRef(summaryStatus)
  const sourceRef = useRef(source)
  const speakRef = useRef(speak)
  const progressRef = useRef(onSentenceProgress)
  const resumeIdxRef = useRef(resumeSentenceIndex)
  const heardRef = useRef(onSummaryHeard)
  const generateChainRef = useRef(onGenerateSummaryForChain)
  const generateRequestedForRef = useRef<string | number | null>(null)

  askRef.current = askContinue
  chainRef.current = chainSummaries
  hasNextRef.current = hasNextChapter
  advanceFnRef.current = onAdvanceChapter
  adaptedRef.current = adaptedText
  originalRef.current = originalText
  summaryRef.current = summaryText
  summaryStatusRef.current = summaryStatus
  sourceRef.current = source
  speakRef.current = speak
  progressRef.current = onSentenceProgress
  resumeIdxRef.current = resumeSentenceIndex
  heardRef.current = onSummaryHeard
  generateChainRef.current = onGenerateSummaryForChain

  useEffect(() => {
    if (source === 'summary' && !summaryText.trim()) {
      setSource('adapted')
    }
  }, [summaryText, source])

  const prevListenSummaryRef = useRef(listenSummaryNonce)
  useEffect(() => {
    if (listenSummaryNonce === prevListenSummaryRef.current) return
    prevListenSummaryRef.current = listenSummaryNonce
    if (listenSummaryNonce === 0 || !summaryText.trim()) return
    play('summary', true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listenSummaryNonce, summaryText])

  lastSentenceRef.current = resumeSentenceIndex

  useEffect(() => {
    try {
      localStorage.setItem(PROMPT_KEY, askContinue ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [askContinue])

  useEffect(() => {
    try {
      localStorage.setItem(CHAIN_KEY, chainSummaries ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [chainSummaries])

  function textFor(src: Source): string {
    if (src === 'summary') return summaryRef.current
    if (src === 'original') return originalRef.current
    return adaptedRef.current
  }

  function reportSentence(index: number) {
    lastSentenceRef.current = index
    progressRef.current?.(index)
  }

  function onPlaybackComplete() {
    reportSentence(0)
    if (sourceRef.current === 'summary') {
      heardRef.current?.()
    }

    // Encadenar resúmenes: avanzar y esperar el resumen del nuevo capítulo.
    if (
      sourceRef.current === 'summary' &&
      chainRef.current &&
      hasNextRef.current &&
      advanceFnRef.current
    ) {
      pendingSummaryChainRef.current = true
      continueRef.current = false
      setPrompt(null)
      const advanced = advanceFnRef.current()
      if (!advanced) pendingSummaryChainRef.current = false
      return
    }

    if (!askRef.current) return
    if (hasNextRef.current && advanceFnRef.current) {
      setPrompt('next')
      return
    }
    setPrompt('finished')
  }

  // Tras confirmar y avanzar (texto adaptado/original), seguir leyendo.
  useEffect(() => {
    if (prevChapterRef.current === chapterKey) return
    prevChapterRef.current = chapterKey

    // Cadena de resúmenes: no hablar hasta que cargue el del capítulo nuevo.
    if (pendingSummaryChainRef.current) return

    if (!continueRef.current) return
    if (sourceRef.current === 'summary') {
      // Evitar reproducir el resumen anterior al cambiar de capítulo.
      continueRef.current = false
      return
    }
    continueRef.current = false
    const text = textFor(sourceRef.current)
    if (!text.trim()) return
    void speakRef.current(text, {
      startSentenceIndex: 0,
      onSentence: reportSentence,
      onComplete: onPlaybackComplete,
    })
  }, [chapterKey, adaptedText, originalText, summaryText])

  // Cuando llega el resumen del capítulo nuevo en una cadena.
  useEffect(() => {
    if (!pendingSummaryChainRef.current) return
    if (!chainRef.current) return

    if (summaryStatus === 'unconfigured') {
      pendingSummaryChainRef.current = false
      generateRequestedForRef.current = null
      setPrompt('finished')
      return
    }

    if (summaryStatus === 'loading') return

    if (summaryText.trim()) {
      pendingSummaryChainRef.current = false
      generateRequestedForRef.current = null
      setSource('summary')
      void speakRef.current(summaryText, {
        startSentenceIndex: 0,
        onSentence: reportSentence,
        onComplete: onPlaybackComplete,
      })
      return
    }

    // Sin resumen: pedir generación una vez por capítulo.
    if (
      summaryStatus === 'idle' &&
      generateChainRef.current &&
      generateRequestedForRef.current !== chapterKey
    ) {
      generateRequestedForRef.current = chapterKey ?? null
      generateChainRef.current()
      return
    }

    // Error o idle sin generador: saltar al siguiente o parar.
    if (summaryStatus === 'error' || summaryStatus === 'idle' || summaryStatus === 'ready') {
      generateRequestedForRef.current = null
      if (hasNextRef.current && advanceFnRef.current) {
        const advanced = advanceFnRef.current()
        if (!advanced) pendingSummaryChainRef.current = false
        return
      }
      pendingSummaryChainRef.current = false
      setPrompt('finished')
    }
  }, [chapterKey, summaryText, summaryStatus])

  const prevSeekRef = useRef(seekNonce)
  useEffect(() => {
    if (seekNonce === prevSeekRef.current) return
    prevSeekRef.current = seekNonce
    if (seekNonce === 0) return
    // Solo saltar si ya había reproducción en curso / pausa
    if (status !== 'speaking' && status !== 'paused' && status !== 'loading') {
      return
    }
    const text = textFor(sourceRef.current)
    if (!text.trim()) return
    void speakRef.current(text, {
      startSentenceIndex: Math.max(0, resumeIdxRef.current),
      onSentence: reportSentence,
      onComplete: onPlaybackComplete,
    })
  }, [seekNonce, status])

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

  function play(next: Source, fromStart = false) {
    setSource(next)
    continueRef.current = false
    setPrompt(null)
    const text =
      next === 'summary'
        ? summaryText
        : next === 'original'
          ? originalText
          : adaptedText
    const startAt = fromStart ? 0 : Math.max(0, resumeIdxRef.current)
    void speak(text, {
      startSentenceIndex: startAt,
      onSentence: reportSentence,
      onComplete: onPlaybackComplete,
    })
  }

  function handlePause() {
    reportSentence(lastSentenceRef.current)
    pause()
  }

  function handleStop() {
    reportSentence(lastSentenceRef.current)
    continueRef.current = false
    setPrompt(null)
    stop()
  }

  const where =
    currentLabel?.trim() ||
    (hasNextChapter ? 'este capítulo' : 'el último capítulo')

  const activeText =
    source === 'summary'
      ? summaryText
      : source === 'original'
        ? originalText
        : adaptedText
  const sentenceCount = splitSentences(activeText).length
  const canResume =
    source !== 'summary' &&
    resumeSentenceIndex > 0 &&
    resumeSentenceIndex < sentenceCount
  const hasSummary = Boolean(summaryText.trim())

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
              onClick={handlePause}
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
              onClick={() => play(hasSummary && source === 'summary' ? 'summary' : 'adapted', false)}
              disabled={!adaptedText.trim() && !hasSummary}
              title={
                canResume
                  ? `Continuar desde la oración ${resumeSentenceIndex + 1}`
                  : 'Reproducir'
              }
              aria-label="Reproducir"
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
            className={`btn ghost audio-src${source === 'adapted' ? ' active' : ''}`}
            onClick={() => play('adapted', false)}
            disabled={!adaptedText.trim() || status === 'loading'}
            title="Escuchar versión adaptada"
          >
            Adaptado
          </button>
          <button
            type="button"
            className={`btn ghost audio-src${source === 'original' ? ' active' : ''}`}
            onClick={() => play('original', false)}
            disabled={!originalText.trim() || status === 'loading'}
            title="Escuchar original"
          >
            Original
          </button>
          <button
            type="button"
            className={`btn ghost audio-src${source === 'summary' ? ' active' : ''}`}
            onClick={() => play('summary', true)}
            disabled={!hasSummary || status === 'loading'}
            title={
              hasSummary
                ? 'Escuchar resumen IA (idea fundamental)'
                : 'Generá un resumen IA del capítulo primero'
            }
          >
            Resumen IA
          </button>
          {canResume && status === 'idle' && (
            <button
              type="button"
              className="btn ghost audio-src"
              onClick={() => play(source, true)}
              title="Empezar el capítulo desde la primera oración"
            >
              Desde el inicio
            </button>
          )}

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
          {hasSummary && (
            <label
              className="audio-advance"
              title="Al terminar un resumen IA, pasar al siguiente capítulo y escucharlo"
            >
              <input
                type="checkbox"
                checked={chainSummaries}
                onChange={(e) => setChainSummaries(e.target.checked)}
              />
              Encadenar resúmenes
            </label>
          )}
        </div>

        <SpeechRateControl
          rate={rate}
          onChange={setRate}
          compact
          disabled={status === 'loading'}
        />

        <StatusDot
          status={status}
          sentenceIndex={resumeSentenceIndex}
          sentenceCount={sentenceCount}
        />
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

function StatusDot({
  status,
  sentenceIndex,
  sentenceCount,
}: {
  status: SpeechStatus
  sentenceIndex: number
  sentenceCount: number
}) {
  if (status === 'idle') {
    if (sentenceIndex > 0 && sentenceCount > 0) {
      return (
        <span className="audio-status status-idle" aria-live="polite">
          Guardado · oración {sentenceIndex + 1}/{sentenceCount}
        </span>
      )
    }
    return null
  }
  const label =
    status === 'loading'
      ? 'Preparando voz…'
      : status === 'speaking'
        ? sentenceCount > 0
          ? `Reproduciendo · oración ${Math.min(sentenceIndex + 1, sentenceCount)}/${sentenceCount}`
          : 'Reproduciendo…'
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
