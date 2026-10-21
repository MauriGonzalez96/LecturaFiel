import type {
  CandidateMatch,
  LexiconEntry,
  SubstitutionDecision,
  TextToken,
} from '../types/lexicon'
import { decisionCache } from './decisionCache'

export interface EvaluationResult {
  candidate: CandidateMatch
  decision: SubstitutionDecision
  substitute: string | null
  reason: string
  fromCache: boolean
}

/**
 * Etapa 2 — decidir si necesita sustitución (evaluación contextual).
 *
 * Reglas conservadoras:
 * - Si hay decisión en caché (lema + palabra previa) y no es 'evaluate', reutilizarla.
 * - Nivel 3 + substitute preferido → substitute (salvo default glossary_only).
 * - Nivel 2 + default substitute + substitute preferido → substitute.
 * - Sin substitute adecuado → glossary_only (conservar en el texto).
 * - default preserve → preserve (no glosario forzado).
 */
export function evaluateCandidate(
  candidate: CandidateMatch,
  tokens: TextToken[],
): EvaluationResult {
  const { entry } = candidate
  const prev = previousWord(tokens, candidate.tokenIndex)
  const cached = decisionCache.get(entry.lemma, prev)

  if (cached && cached.decision !== 'evaluate') {
    return {
      candidate,
      decision: cached.decision,
      substitute: resolveSubstitute(entry, cached.substitute ?? null),
      reason: 'Decisión reutilizada desde caché contextual.',
      fromCache: true,
    }
  }

  const context = localContext(tokens, candidate.tokenIndex)
  const decision = resolveDecision(entry, context, prev)
  const substitute =
    decision === 'substitute' ? resolveSubstitute(entry, null) : null

  if (decision !== 'evaluate') {
    decisionCache.set(entry.lemma, decision, substitute, prev)
  }

  return {
    candidate,
    decision,
    substitute,
    reason: explain(entry, decision),
    fromCache: false,
  }
}

export function evaluateAll(
  candidates: CandidateMatch[],
  tokens: TextToken[],
): EvaluationResult[] {
  return candidates.map((c) => evaluateCandidate(c, tokens))
}

function resolveDecision(
  entry: LexiconEntry,
  context: string,
  previous: string | null,
): SubstitutionDecision {
  if (entry.defaultDecision === 'preserve') return 'preserve'

  if (entry.defaultDecision === 'glossary_only') return 'glossary_only'

  if (entry.defaultDecision === 'substitute') {
    return entry.preferredSubstitute ? 'substitute' : 'glossary_only'
  }

  // 'evaluate': heurística contextual
  if (!entry.preferredSubstitute) return 'glossary_only'

  // «por ende» es expresión vigente → no tocar
  if (entry.lemma === 'ende' && (previous === 'por' || /\bpor\s+ende\b/.test(context))) {
    return 'preserve'
  }

  // Si el sustituto ya aparece cerca, preferir glosario para no empobrecer.
  const sub = entry.preferredSubstitute.toLowerCase()
  if (context.includes(sub)) return 'glossary_only'

  // Nivel 3: inclinación a sustituir; nivel 2: más cautela
  if (entry.level >= 3) return 'substitute'
  if (entry.notes?.toLowerCase().includes('conservar')) return 'glossary_only'
  return 'substitute'
}

function resolveSubstitute(
  entry: LexiconEntry,
  override: string | null,
): string | null {
  if (override !== null && override !== undefined) return override
  return entry.preferredSubstitute ?? null
}

function previousWord(tokens: TextToken[], index: number): string | null {
  for (let i = index - 1; i >= 0; i--) {
    const t = tokens[i]
    if (t?.isWord) return t.normalized
  }
  return null
}

function localContext(tokens: TextToken[], index: number): string {
  const from = Math.max(0, index - 8)
  const to = Math.min(tokens.length, index + 9)
  return tokens
    .slice(from, to)
    .map((t) => t.normalized)
    .join(' ')
    .toLowerCase()
}

function explain(
  entry: LexiconEntry,
  decision: SubstitutionDecision,
): string {
  switch (decision) {
    case 'substitute':
      return `Nivel ${entry.level}: existe alternativa que conserva el sentido («${entry.preferredSubstitute}»).`
    case 'glossary_only':
      return `Nivel ${entry.level}: se conserva en el texto; se explica en el glosario.`
    case 'preserve':
      return `Nivel ${entry.level}: vocabulario literario/formal vigente; no intervenir.`
    case 'evaluate':
      return 'Pendiente de evaluación contextual más fina.'
  }
}
