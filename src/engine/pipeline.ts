import { buildFormIndex, normalizeForm, SEED_LEXICON } from '../data/lexicon'
import type { InterventionOptions } from '../settings/intervention'
import type { LexiconEntry, PipelineResult } from '../types/lexicon'
import { detectCandidates } from './detector'
import { evaluateAll } from './evaluator'
import { applySubstitutions } from './substitutor'

export interface RunPipelineOptions {
  chapter?: number
  lexicon?: LexiconEntry[]
  intervention?: InterventionOptions
}

/**
 * Pipeline de tres etapas (especificación §3):
 * 1. Detectar candidatas (según nivel de intervención)
 * 2. Evaluar si necesitan sustitución
 * 3. Sustituciones mínimas + glosario
 */
export function runPipeline(
  text: string,
  chapterOrOptions: number | RunPipelineOptions = 1,
  lexiconArg?: LexiconEntry[],
): PipelineResult {
  // Compat: runPipeline(text, chapter, lexicon) o runPipeline(text, { chapter, intervention })
  let chapter = 1
  let lexicon: LexiconEntry[] = SEED_LEXICON
  let intervention: InterventionOptions | undefined

  if (typeof chapterOrOptions === 'number') {
    chapter = chapterOrOptions
    if (lexiconArg) lexicon = lexiconArg
  } else {
    chapter = chapterOrOptions.chapter ?? 1
    lexicon = chapterOrOptions.lexicon ?? SEED_LEXICON
    intervention = chapterOrOptions.intervention
  }

  const { tokens, candidates, rarityCount } = detectCandidates(
    text,
    lexicon,
    intervention,
  )
  const evaluations = evaluateAll(candidates, tokens, intervention)
  const { adaptedText, substitutions, glossary } = applySubstitutions(
    text,
    tokens,
    evaluations,
    chapter,
  )

  const wordCount = tokens.filter((t) => t.isWord).length
  const glossaryOnly = evaluations.filter(
    (e) => e.decision === 'glossary_only',
  ).length

  const level1Index = buildFormIndex(lexicon.filter((e) => e.level === 1))
  const preservedLiterary = tokens.filter(
    (t) => t.isWord && level1Index.has(normalizeForm(t.normalized)),
  ).length

  return {
    originalText: text,
    adaptedText,
    chapter,
    candidates,
    substitutions,
    glossary,
    stats: {
      wordsAnalyzed: wordCount,
      candidatesFound: candidates.length,
      rarityDetected: rarityCount,
      substituted: substitutions.length,
      glossaryOnly,
      preservedLiterary,
    },
  }
}
