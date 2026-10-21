import type { PipelineResult } from '../types/lexicon'
import { tokenize } from '../engine/tokenizer'

interface Props {
  result: PipelineResult
  mode: 'original' | 'adapted'
}

/** Resalta sustituciones y candidatas conservadas en el texto. */
export function HighlightedText({ result, mode }: Props) {
  if (mode === 'adapted') {
    return <AdaptedView result={result} />
  }
  return <OriginalView result={result} />
}

function OriginalView({ result }: { result: PipelineResult }) {
  const tokens = tokenize(result.originalText)
  const subIndexes = new Map(
    result.substitutions.map((s) => [s.tokenIndex, s]),
  )
  const candIndexes = new Set(result.candidates.map((c) => c.tokenIndex))

  return (
    <p className="reader-prose">
      {tokens.map((token, i) => {
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
      })}
    </p>
  )
}

function AdaptedView({ result }: { result: PipelineResult }) {
  const tokens = tokenize(result.originalText)
  const subByIndex = new Map(
    result.substitutions.map((s) => [s.tokenIndex, s]),
  )
  const glossaryOnly = new Set(
    result.glossary
      .filter((g) => g.kind === 'preserved_difficult')
      .map((g) => g.lemma),
  )
  const candByIndex = new Map(
    result.candidates.map((c) => [c.tokenIndex, c]),
  )

  return (
    <p className="reader-prose">
      {tokens.map((token, i) => {
        if (!token.isWord) return <span key={i}>{token.raw}</span>
        const sub = subByIndex.get(i)
        if (sub) {
          return (
            <mark
              key={i}
              className="hl hl-new"
              title={`Original: ${sub.original}`}
            >
              {sub.replacement}
            </mark>
          )
        }
        const cand = candByIndex.get(i)
        if (cand && glossaryOnly.has(cand.entry.lemma)) {
          return (
            <mark key={i} className="hl hl-keep" title="En glosario">
              {token.raw}
            </mark>
          )
        }
        return <span key={i}>{token.raw}</span>
      })}
    </p>
  )
}
