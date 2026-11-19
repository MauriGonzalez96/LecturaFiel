import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  /** Oración del resumen IA (cursor / reanudación). */
  resumeSummaryIndex?: number
  /** Persistir oración actual (audio / pausa). */
  onSentenceProgress?: (sentenceIndex: number) => void
  /** Persistir oración del resumen (cursor). */
  onSummarySentenceProgress?: (sentenceIndex: number) => void
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
  /** Avisa qué se está leyendo (para resaltar texto y cambiar de pestaña). */
  onNowPlaying?: (info: NowPlayingInfo | null) => void
  /** Barra fija inferior (estilo Spotify). */
  variant?: 'default' | 'dock'
}

export type AudioSource = 'adapted' | 'original' | 'summary'

export type NowPlayingInfo = {
  source: AudioSource
  status: SpeechStatus
  sentenceIndex: number
  sentenceText: string
  chapterLabel: string
}

type Source = AudioSource
type PromptKind = 'next' | 'finished' | null

const SOURCE_LABEL: Record<Source, string> = {
  adapted: 'Adaptado',
  original: 'Original',
  summary: 'Resumen IA',
}

const PROMPT_KEY = 'lektor:ask-continue'
const CHAIN_KEY = 'lektor:chain-summaries'

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
  resumeSummaryIndex = 0,
  onSentenceProgress,
  onSummarySentenceProgress,
  seekNonce = 0,
  listenSummaryNonce = 0,
  summaryStatus = 'idle',
  onSummaryHeard,
  onGenerateSummaryForChain,
  onNowPlaying,
  variant = 'default',
}: Props) {
  const dock = variant === 'dock'
  const { status, speak, stop, pause, resume } = useSpeech()
  const { rate, setRate } = useSpeechRate()
  const [askContinue, setAskContinue] = useState(readAskContinue)
  const [chainSummaries, setChainSummaries] = useState(readChainSummaries)
  const [source, setSource] = useState<Source>('adapted')
  const [prompt, setPrompt] = useState<PromptKind>(null)
  const [liveSentence, setLiveSentence] = useState(resumeSentenceIndex)
  const continueRef = useRef(false)
  const pendingSummaryChainRef = useRef(false)
  const prevChapterRef = useRef(chapterKey)
  const lastSentenceRef = useRef(resumeSentenceIndex)
  const titleId = useId()
  const nowPlayingRef = useRef(onNowPlaying)
  nowPlayingRef.current = onNowPlaying

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
  const summaryProgressRef = useRef(onSummarySentenceProgress)
  const resumeIdxRef = useRef(resumeSentenceIndex)
  const resumeSummaryIdxRef = useRef(resumeSummaryIndex)
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
  summaryProgressRef.current = onSummarySentenceProgress
  resumeIdxRef.current = resumeSentenceIndex
  resumeSummaryIdxRef.current = resumeSummaryIndex
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
    play('summary', false)
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
    setLiveSentence(index)
    if (sourceRef.current === 'summary') {
      summaryProgressRef.current?.(index)
      return
    }
    progressRef.current?.(index)
  }

  function resumeIndexFor(src: Source): number {
    return src === 'summary'
      ? Math.max(0, resumeSummaryIdxRef.current)
      : Math.max(0, resumeIdxRef.current)
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
    const src = sourceRef.current
    const startAt = resumeIndexFor(src)
    setLiveSentence(startAt)
    // Si hay audio en curso / pausa, saltar ahí; si no, solo mueve el cursor visual.
    if (status !== 'speaking' && status !== 'paused' && status !== 'loading') {
      return
    }
    const text = textFor(src)
    if (!text.trim()) return
    void speakRef.current(text, {
      startSentenceIndex: startAt,
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

  const where =
    currentLabel?.trim() ||
    (hasNextChapter ? 'este capítulo' : 'el último capítulo')

  const activeText =
    source === 'summary'
      ? summaryText
      : source === 'original'
        ? originalText
        : adaptedText
  const sentences = splitSentences(activeText)
  const sentenceCount = sentences.length
  const idleResumeIndex =
    source === 'summary' ? resumeSummaryIndex : resumeSentenceIndex
  const spokenIndex =
    status === 'speaking' || status === 'paused' || status === 'loading'
      ? liveSentence
      : idleResumeIndex
  const spokenText =
    sentences[Math.min(spokenIndex, Math.max(0, sentenceCount - 1))] ?? ''
  const canResume =
    idleResumeIndex > 0 && idleResumeIndex < sentenceCount
  const hasSummary = Boolean(summaryText.trim())
  const chapterLabel = currentLabel?.trim() || 'Capítulo actual'

  useEffect(() => {
    if (status === 'unsupported') {
      nowPlayingRef.current?.(null)
      return
    }
    if (status === 'idle' && !prompt) {
      nowPlayingRef.current?.(null)
      return
    }
    if (status === 'idle') return
    nowPlayingRef.current?.({
      source,
      status,
      sentenceIndex: spokenIndex,
      sentenceText: spokenText,
      chapterLabel,
    })
  }, [status, source, spokenIndex, spokenText, chapterLabel, prompt])

  function play(next: Source, fromStart = false) {
    setSource(next)
    continueRef.current = false
    setPrompt(null)
    const startAt = fromStart ? 0 : resumeIndexFor(next)
    setLiveSentence(startAt)
    const text =
      next === 'summary'
        ? summaryText
        : next === 'original'
          ? originalText
          : adaptedText
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

  if (status === 'unsupported') {
    return (
      <div className="audio-bar muted">
        Tu navegador no soporta lectura en voz alta.
      </div>
    )
  }

  const nowBlock = (
    <div className="audio-now" aria-live="polite">
      <div className="audio-now-meta">
        <strong>{SOURCE_LABEL[source]}</strong>
        <span aria-hidden="true">·</span>
        <span>{chapterLabel}</span>
        {(status === 'speaking' ||
          status === 'paused' ||
          status === 'loading') &&
          sentenceCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                oración {Math.min(spokenIndex + 1, sentenceCount)}/
                {sentenceCount}
              </span>
            </>
          )}
      </div>
      {!dock &&
        (status === 'speaking' ||
          status === 'paused' ||
          status === 'loading') && (
          <p className="audio-now-line">
            {status === 'loading'
              ? 'Preparando voz…'
              : spokenText
                ? `«${spokenText.length > 160 ? `${spokenText.slice(0, 157)}…` : spokenText}»`
                : 'Leyendo…'}
          </p>
        )}
      {!dock && status === 'idle' && !hasSummary && source !== 'summary' && (
        <p className="audio-now-hint muted">
          Estás en el texto {SOURCE_LABEL[source].toLowerCase()}. Generá un
          resumen IA del capítulo para verlo y escucharlo acá.
        </p>
      )}
      {!dock && status === 'idle' && hasSummary && source !== 'summary' && (
        <p className="audio-now-hint muted">
          Resumen listo para «{chapterLabel}». Usá el botón «Resumen IA» o
          abrí la pestaña Resumen IA.
        </p>
      )}
    </div>
  )

  const transport = (
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
            onClick={() =>
              play(
                hasSummary && source === 'summary' ? 'summary' : 'adapted',
                false,
              )
            }
            disabled={!adaptedText.trim() && !hasSummary}
            title={
              canResume
                ? `Continuar desde la oración ${idleResumeIndex + 1}`
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
          onClick={() => play('summary', false)}
          disabled={!hasSummary || status === 'loading'}
          title={
            hasSummary
              ? 'Escuchar explicación detallada (Resumen IA); respeta el cursor'
              : 'Generá la explicación detallada del capítulo primero'
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

        {onOpenVoices && !dock && (
          <button
            type="button"
            className="btn ghost audio-src"
            onClick={onOpenVoices}
            title="Elegir y probar voces"
          >
            Voces…
          </button>
        )}

        {!dock && (
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
        )}
        {!dock && hasSummary && (
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

      {!dock && (
        <SpeechRateControl
          rate={rate}
          onChange={setRate}
          compact
          disabled={status === 'loading'}
        />
      )}

      {!dock && (
        <StatusDot
          status={status}
          sourceLabel={SOURCE_LABEL[source]}
          chapterLabel={chapterLabel}
          sentenceIndex={spokenIndex}
          sentenceCount={sentenceCount}
        />
      )}
    </div>
  )

  return (
    <>
      {dock ? (
        <div className="player-dock-inner">
          {nowBlock}
          {transport}
          <div className="player-dock-meta">
            <SpeechRateControl
              rate={rate}
              onChange={setRate}
              compact
              disabled={status === 'loading'}
            />
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
              Avisar
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
                Encadenar
              </label>
            )}
          </div>
        </div>
      ) : (
        <>
          {nowBlock}
          {transport}
        </>
      )}

      {prompt === 'next' &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="modal-backdrop modal-backdrop-portal"
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
          </div>,
          document.body,
        )}

      {prompt === 'finished' &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="modal-backdrop modal-backdrop-portal"
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
          </div>,
          document.body,
        )}
    </>
  )
}

function StatusDot({
  status,
  sourceLabel,
  chapterLabel,
  sentenceIndex,
  sentenceCount,
}: {
  status: SpeechStatus
  sourceLabel: string
  chapterLabel: string
  sentenceIndex: number
  sentenceCount: number
}) {
  if (status === 'idle') {
    if (sentenceIndex > 0 && sentenceCount > 0) {
      return (
        <span className="audio-status status-idle" aria-live="polite">
          Guardado · {sourceLabel} · oración {sentenceIndex + 1}/{sentenceCount}
        </span>
      )
    }
    return (
      <span className="audio-status status-idle muted" aria-live="polite">
        {sourceLabel} · {chapterLabel}
      </span>
    )
  }
  const label =
    status === 'loading'
      ? `Preparando voz · ${sourceLabel} · ${chapterLabel}`
      : status === 'speaking'
        ? sentenceCount > 0
          ? `${sourceLabel} · oración ${Math.min(sentenceIndex + 1, sentenceCount)}/${sentenceCount}`
          : `Reproduciendo · ${sourceLabel}`
        : `En pausa · ${sourceLabel}`
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
