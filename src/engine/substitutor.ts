import type {
  GlossaryItem,
  SubstitutionEvent,
  TextToken,
} from '../types/lexicon'
import type { EvaluationResult } from './evaluator'
import { matchCasing, sentenceAround } from './tokenizer'

/**
 * Etapa 3 — sustituciones mínimas + construcción del glosario.
 * Solo modifica el término (o expresión) estrictamente necesario.
 */
export function applySubstitutions(
  originalText: string,
  tokens: TextToken[],
  evaluations: EvaluationResult[],
  chapter: number,
): {
  adaptedText: string
  substitutions: SubstitutionEvent[]
  glossary: GlossaryItem[]
} {
  const byIndex = new Map<number, EvaluationResult>()
  for (const ev of evaluations) {
    byIndex.set(ev.candidate.tokenIndex, ev)
  }

  const parts: string[] = []
  const substitutions: SubstitutionEvent[] = []
  const glossary: GlossaryItem[] = []
  const seenLemmas = new Set<string>()

  tokens.forEach((token, index) => {
    const ev = byIndex.get(index)
    if (!ev || ev.decision !== 'substitute' || !ev.substitute) {
      parts.push(token.raw)

      if (
        ev &&
        (ev.decision === 'glossary_only' ||
          (ev.decision === 'preserve' && ev.candidate.entry.level >= 2))
      ) {
        maybePushGlossary(
          glossary,
          seenLemmas,
          ev,
          originalText,
          chapter,
          'preserved_difficult',
        )
      }
      return
    }

    const replacement = matchCasing(token.raw, ev.substitute)
    parts.push(replacement)
    substitutions.push({
      tokenIndex: index,
      original: token.raw,
      replacement,
      entry: ev.candidate.entry,
    })
    maybePushGlossary(
      glossary,
      seenLemmas,
      ev,
      originalText,
      chapter,
      'substituted',
      replacement,
    )
  })

  return {
    adaptedText: parts.join(''),
    substitutions,
    glossary,
  }
}

function maybePushGlossary(
  glossary: GlossaryItem[],
  seenLemmas: Set<string>,
  ev: EvaluationResult,
  originalText: string,
  chapter: number,
  kind: GlossaryItem['kind'],
  audioExpression?: string,
): void {
  const lemma = ev.candidate.entry.lemma
  if (seenLemmas.has(lemma)) return
  seenLemmas.add(lemma)

  glossary.push({
    id: `${chapter}-${lemma}`,
    word: ev.candidate.token.raw,
    lemma,
    definition: ev.candidate.entry.definition,
    kind,
    audioExpression,
    originalSentence: sentenceAround(
      originalText,
      ev.candidate.token.start,
    ),
    chapter,
    level: ev.candidate.entry.level,
  })
}
