import { useEffect, useRef, type RefObject } from 'react'
import { sentenceSpans } from '../engine/sentences'
import { tokenize } from '../engine/tokenizer'
import type { PipelineResult, TextToken } from '../types/lexicon'

interface Props {
  result: PipelineResult
  mode: 'original' | 'adapted'
  /** Oración activa (progreso guardado / audio). */
  activeSentenceIndex?: number
  onSentenceVisible?: (index: number) => void
}

/** Resalta sustituciones y la oración donde quedó la lectura. */
export function HighlightedText({
  result,
  mode,
  activeSentenceIndex = 0,
  onSentenceVisible,
}: Props) {
  const sourceText =
    mode === 'adapted' ? result.adaptedText : result.originalText
  // El progreso se guarda sobre el texto adaptado (audio por defecto);
  // en original usamos el mismo índice (suele alinear por oración).
  const spans = sentenceSpans(
    mode === 'adapted' ? result.adaptedText : result.originalText,
  )
  const activeRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [activeSentenceIndex, sourceText])

  useEffect(() => {
    if (!onSentenceVisible || spans.length === 0) return
    const root = document.querySelector('.result-body')
    const nodes = (root ?? document).querySelectorAll<HTMLElement>(
      '[data-sentence]',
    )
    if (!nodes.length) return

    const ratios = new Map<number, number>()
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const i = Number((entry.target as HTMLElement).dataset.sentence)
          if (Number.isFinite(i)) {
            ratios.set(i, entry.isIntersecting ? entry.intersectionRatio : 0)
          }
        }
        let best = -1
        let bestRatio = 0.15
        for (const [i, r] of ratios) {
          if (r > bestRatio) {
            bestRatio = r
            best = i
          }
        }
        if (best >= 0) onSentenceVisible(best)
      },
      {
        root: root instanceof Element ? root : null,
        threshold: [0.2, 0.45, 0.7],
      },
    )
    nodes.forEach((n) => obs.observe(n))
    return () => obs.disconnect()
  }, [onSentenceVisible, spans.length, sourceText])

  if (spans.length === 0) {
    return <p className="reader-prose">{sourceText}</p>
  }

  if (mode === 'adapted') {
    return (
      <AdaptedSentences
        result={result}
        spans={spans}
        activeSentenceIndex={activeSentenceIndex}
        activeRef={activeRef}
      />
    )
  }

  return (
    <OriginalSentences
      result={result}
      spans={spans}
      activeSentenceIndex={activeSentenceIndex}
      activeRef={activeRef}
    />
  )
}

function OriginalSentences({
  result,
  spans,
  activeSentenceIndex,
  activeRef,
}: {
  result: PipelineResult
  spans: ReturnType<typeof sentenceSpans>
  activeSentenceIndex: number
  activeRef: RefObject<HTMLElement | null>
}) {
  const tokens = tokenize(result.originalText)
  const subIndexes = new Map(
    result.substitutions.map((s) => [s.tokenIndex, s]),
  )
  const candIndexes = new Set(result.candidates.map((c) => c.tokenIndex))

  return (
    <div className="reader-prose">
      {spans.map((span) => (
        <span
          key={span.index}
          ref={span.index === activeSentenceIndex ? activeRef : undefined}
          data-sentence={span.index}
          className={sentenceClass(span.index, activeSentenceIndex)}
        >
          {tokensInSpan(tokens, span.start, span.end).map(({ token, i }) => {
            if (!token.isWord) return <span key={i}>{token.raw}</span>
            if (subIndexes.has(i)) {
              return (
                <mark key={i} className="hl hl-sub" title="Se sustituirá">
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
          })}{' '}
        </span>
      ))}
    </div>
  )
}

function AdaptedSentences({
  result,
  spans,
  activeSentenceIndex,
  activeRef,
}: {
  result: PipelineResult
  spans: ReturnType<typeof sentenceSpans>
  activeSentenceIndex: number
  activeRef: RefObject<HTMLElement | null>
}) {
  // Marcas sobre el original, pero el corte de oraciones es del adaptado
  // (alineado al audio). Dentro de cada oración adaptada resaltamos por lema.
  const subLemmas = new Map(
    result.substitutions.map((s) => [s.entry.lemma, s]),
  )
  const glossaryOnly = new Set(
    result.glossary
      .filter((g) => g.kind === 'preserved_difficult')
      .map((g) => g.lemma),
  )

  return (
    <div className="reader-prose">
      {spans.map((span) => {
        const tokens = tokenize(span.text)
        return (
          <span
            key={span.index}
            ref={span.index === activeSentenceIndex ? activeRef : undefined}
            data-sentence={span.index}
            className={sentenceClass(span.index, activeSentenceIndex)}
          >
            {tokens.map((token, i) => {
              if (!token.isWord) return <span key={i}>{token.raw}</span>
              const sub = [...subLemmas.values()].find(
                (s) =>
                  s.replacement.toLowerCase() === token.normalized ||
                  s.original.toLowerCase() === token.normalized,
              )
              if (sub && sub.replacement.toLowerCase() === token.normalized) {
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
            })}{' '}
          </span>
        )
      })}
    </div>
  )
}

function sentenceClass(index: number, active: number): string {
  return index === active ? 'reader-sentence is-active' : 'reader-sentence'
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
