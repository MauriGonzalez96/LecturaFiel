import { useEffect, useRef } from 'react'
import { splitSentences } from '../engine/sentences'

interface Props {
  text: string
  chapterLabel?: string
  activeSentenceIndex?: number | null
  emptyHint?: string
  /** Colocar cursor / reanudar desde esa oración del resumen. */
  onPlaceCursor?: (sentenceIndex: number) => void
}

/** Vista del resumen IA con oración activa al escuchar. */
export function SummaryReadView({
  text,
  chapterLabel,
  activeSentenceIndex = null,
  emptyHint = 'Generá el resumen arriba para verlo y escucharlo con el botón «Resumen IA».',
  onPlaceCursor,
}: Props) {
  const activeBtnRef = useRef<HTMLButtonElement | null>(null)
  const activeSpanRef = useRef<HTMLSpanElement | null>(null)
  const sentences = splitSentences(text)
  const hasText = Boolean(text.trim())
  const clickable = Boolean(onPlaceCursor)

  useEffect(() => {
    const el = activeBtnRef.current ?? activeSpanRef.current
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeSentenceIndex, text])

  if (!hasText) {
    return <p className="muted">{emptyHint}</p>
  }

  return (
    <div className="chapter-summary-read">
      {chapterLabel ? (
        <header className="chapter-summary-read-head">
          <span className="chapter-summary-read-kicker">
            Explicación detallada
          </span>
          <h3>{chapterLabel}</h3>
        </header>
      ) : null}
      {clickable ? (
        <p className="chapter-summary-read-hint muted">
          Tocá una oración para poner el cursor y seguir desde ahí.
        </p>
      ) : null}
      <div className="chapter-summary-read-body">
        {sentences.map((sentence, i) => {
          const active =
            activeSentenceIndex != null && i === activeSentenceIndex
          const className = [
            'summary-sentence',
            active ? 'summary-sentence-active' : '',
            clickable ? 'summary-sentence-clickable' : '',
          ]
            .filter(Boolean)
            .join(' ')
          const gap = i < sentences.length - 1 ? ' ' : ''

          if (!clickable) {
            return (
              <span
                key={i}
                ref={active ? activeSpanRef : undefined}
                className={className}
              >
                {sentence}
                {gap}
              </span>
            )
          }

          return (
            <button
              key={i}
              type="button"
              ref={active ? activeBtnRef : undefined}
              className={className}
              onClick={() => onPlaceCursor?.(i)}
              title={`Colocar cursor en la oración ${i + 1}`}
              aria-current={active ? 'true' : undefined}
            >
              {active ? (
                <span className="reader-caret" aria-hidden="true">
                  ▶
                </span>
              ) : null}
              {sentence}
              {gap}
            </button>
          )
        })}
      </div>
    </div>
  )
}
