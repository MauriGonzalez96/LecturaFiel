import { buildFormIndex, normalizeForm, SEED_LEXICON } from '../data/lexicon'
import type { LexiconEntry, PipelineResult } from '../types/lexicon'
import { detectCandidates } from './detector'
import { evaluateAll } from './evaluator'
import { applySubstitutions } from './substitutor'

/**
 * Pipeline de tres etapas (especificación §3):
 * 1. Detectar candidatas (léxico N2–N3 + rareza por frecuencias)
 * 2. Evaluar si necesitan sustitución
 * 3. Sustituciones mínimas + glosario
 */
export function runPipeline(
  text: string,
  chapter = 1,
  lexicon: LexiconEntry[] = SEED_LEXICON,
): PipelineResult {
  const { tokens, candidates, rarityCount } = detectCandidates(text, lexicon)
  const evaluations = evaluateAll(candidates, tokens)
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

  // Formas de nivel 1 presentes en el texto (conservadas a propósito)
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
