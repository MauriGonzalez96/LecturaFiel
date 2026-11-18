import { useEffect, useRef } from 'react'
import { splitSentences } from '../engine/sentences'

interface Props {
  text: string
  chapterLabel?: string
  activeSentenceIndex?: number | null
  emptyHint?: string
}

/** Vista del resumen IA con oración activa al escuchar. */
export function SummaryReadView({
  text,
  chapterLabel,
  activeSentenceIndex = null,
  emptyHint = 'Generá el resumen arriba para verlo y escucharlo con el botón «Resumen IA».',
}: Props) {
  const activeRef = useRef<HTMLSpanElement | null>(null)
  const sentences = splitSentences(text)
  const hasText = Boolean(text.trim())

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
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
      <p className="chapter-summary-read-body">
        {sentences.map((sentence, i) => {
          const active = activeSentenceIndex != null && i === activeSentenceIndex
          return (
            <span
              key={i}
              ref={active ? activeRef : undefined}
              className={
                active
                  ? 'summary-sentence summary-sentence-active'
                  : 'summary-sentence'
              }
            >
              {sentence}
              {i < sentences.length - 1 ? ' ' : ''}
            </span>
          )
        })}
      </p>
    </div>
  )
}
