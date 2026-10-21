import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { sentenceSpans } from '../engine/sentences'
import { tokenize } from '../engine/tokenizer'
import type { PipelineResult, TextToken } from '../types/lexicon'

interface Props {
  result: PipelineResult
  /** Oración activa (progreso / audio). */
  activeSentenceIndex?: number
  /** Clic en una oración → colocar cursor de lectura. */
  onPlaceCursor?: (sentenceIndex: number) => void
}

/**
 * Texto original | adaptado, con cursor de lectura colocable.
 */
export function HighlightedText({
  result,
  activeSentenceIndex = 0,
  onPlaceCursor,
}: Props) {
  const leftRef = useRef<HTMLButtonElement | null>(null)
  const rightRef = useRef<HTMLButtonElement | null>(null)
  const originalSpans = sentenceSpans(result.originalText)
  const adaptedSpans = sentenceSpans(result.adaptedText)

  useEffect(() => {
    const el = rightRef.current ?? leftRef.current
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeSentenceIndex, result.adaptedText, result.originalText])

  return (
    <div className="dual-reader" role="group" aria-label="Original y adaptado">
      <div className="dual-pane">
        <header className="dual-pane-head">Original</header>
        <OriginalColumn
          result={result}
          spans={originalSpans}
          activeSentenceIndex={activeSentenceIndex}
          activeRef={leftRef}
          onPlaceCursor={onPlaceCursor}
        />
      </div>
      <div className="dual-pane dual-pane-adapted">
        <header className="dual-pane-head">
          Se lee
          <span className="dual-cursor-hint" title="Clic en una oración para colocar el cursor">
            · clic = cursor
          </span>
        </header>
        <AdaptedColumn
          result={result}
          spans={adaptedSpans}
          activeSentenceIndex={activeSentenceIndex}
          activeRef={rightRef}
          onPlaceCursor={onPlaceCursor}
        />
      </div>
    </div>
  )
}

function OriginalColumn({
  result,
  spans,
  activeSentenceIndex,
  activeRef,
  onPlaceCursor,
}: {
  result: PipelineResult
  spans: ReturnType<typeof sentenceSpans>
  activeSentenceIndex: number
  activeRef: RefObject<HTMLButtonElement | null>
  onPlaceCursor?: (i: number) => void
}) {
  const tokens = tokenize(result.originalText)
  const subIndexes = new Map(
    result.substitutions.map((s) => [s.tokenIndex, s]),
  )
  const candIndexes = new Set(result.candidates.map((c) => c.tokenIndex))

  if (spans.length === 0) {
    return <p className="reader-prose">{result.originalText}</p>
  }

  return (
    <div className="reader-prose">
      {spans.map((span) => (
        <SentenceShell
          key={span.index}
          index={span.index}
          active={span.index === activeSentenceIndex}
          activeRef={activeRef}
          onPlaceCursor={onPlaceCursor}
        >
          {tokensInSpan(tokens, span.start, span.end).map(({ token, i }) => {
            if (!token.isWord) return <span key={i}>{token.raw}</span>
            if (subIndexes.has(i)) {
              return (
                <mark key={i} className="hl hl-sub" title="Se sustituye al leer">
                  {token.raw}
                </mark>
              )
            }
            if (candIndexes.has(i)) {
              return (
                <mark key={i} className="hl hl-keep" title="Difícil, se conserva">
                  {token.raw}
                </mark>
              )
            }
            return <span key={i}>{token.raw}</span>
          })}
        </SentenceShell>
      ))}
    </div>
  )
}

function AdaptedColumn({
  result,
  spans,
  activeSentenceIndex,
  activeRef,
  onPlaceCursor,
}: {
  result: PipelineResult
  spans: ReturnType<typeof sentenceSpans>
  activeSentenceIndex: number
  activeRef: RefObject<HTMLButtonElement | null>
  onPlaceCursor?: (i: number) => void
}) {
  const subByReplacement = new Map(
    result.substitutions.map((s) => [s.replacement.toLowerCase(), s]),
  )
  const glossaryOnly = new Set(
    result.glossary
      .filter((g) => g.kind === 'preserved_difficult')
      .map((g) => g.lemma),
  )

  if (spans.length === 0) {
    return <p className="reader-prose">{result.adaptedText}</p>
  }

  return (
    <div className="reader-prose">
      {spans.map((span) => {
        const tokens = tokenize(span.text)
        return (
          <SentenceShell
            key={span.index}
            index={span.index}
            active={span.index === activeSentenceIndex}
            activeRef={activeRef}
            onPlaceCursor={onPlaceCursor}
            showCaret
          >
            {tokens.map((token, i) => {
              if (!token.isWord) return <span key={i}>{token.raw}</span>
              const sub = subByReplacement.get(token.normalized)
              if (sub) {
                return (
                  <mark
                    key={i}
                    className="hl hl-new"
                    title={`Original: ${sub.original}`}
                  >
                    {token.raw}
                  </mark>
                )
              }
              const cand = result.candidates.find(
                (c) => c.token.normalized === token.normalized,
              )
              if (cand && glossaryOnly.has(cand.entry.lemma)) {
                return (
                  <mark key={i} className="hl hl-keep" title="En glosario">
                    {token.raw}
                  </mark>
                )
              }
              return <span key={i}>{token.raw}</span>
            })}
          </SentenceShell>
        )
      })}
    </div>
  )
}

function SentenceShell({
  index,
  active,
  activeRef,
  onPlaceCursor,
  showCaret,
  children,
}: {
  index: number
  active: boolean
  activeRef: RefObject<HTMLButtonElement | null>
  onPlaceCursor?: (i: number) => void
  showCaret?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      ref={active ? activeRef : undefined}
      data-sentence={index}
      className={
        active
          ? 'reader-sentence is-active is-clickable'
          : 'reader-sentence is-clickable'
      }
      onClick={() => onPlaceCursor?.(index)}
      title={`Colocar cursor en la oración ${index + 1}`}
      aria-current={active ? 'true' : undefined}
    >
      {showCaret && active ? (
        <span className="reader-caret" aria-hidden="true">
          ▶
        </span>
      ) : null}
      {children}{' '}
    </button>
  )
}

function tokensInSpan(
  tokens: TextToken[],
  start: number,
  end: number,
): { token: TextToken; i: number }[] {
  const out: { token: TextToken; i: number }[] = []
  tokens.forEach((token, i) => {
    if (token.start < end && token.end > start) out.push({ token, i })
  })
  return out
}
