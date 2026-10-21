import type { InterventionOptions } from '../settings/intervention'
import type {
  CandidateMatch,
  LexiconEntry,
  SubstitutionDecision,
  TextToken,
} from '../types/lexicon'
import { decisionCache } from './decisionCache'
import { pickSubstitute } from './simplify'

export interface EvaluationResult {
  candidate: CandidateMatch
  decision: SubstitutionDecision
  substitute: string | null
  reason: string
  fromCache: boolean
}

const DEFAULT_OPTS: InterventionOptions = {
  modeId: '3',
  minLevel: 2,
  includeRarity: true,
  forceSubstitute: false,
  preferSimplest: false,
  includeLiterary: false,
}

/**
 * Etapa 2 — decidir si necesita sustitución (evaluación contextual).
 * El modo de intervención (1–4) cambia agresividad y simplicidad del reemplazo.
 */
export function evaluateCandidate(
  candidate: CandidateMatch,
  tokens: TextToken[],
  opts: InterventionOptions = DEFAULT_OPTS,
): EvaluationResult {
  const { entry } = candidate
  const prev = previousWord(tokens, candidate.tokenIndex)
  const cached = decisionCache.get(entry.lemma, prev, opts.modeId)

  if (cached && cached.decision !== 'evaluate') {
    const sub = pickSubstitute(
      entry,
      opts.preferSimplest,
      cached.substitute ?? null,
    )
    // Caché corrupta (modo Simple + rareza) → reevaluar
    if (cached.decision === 'substitute' && !sub) {
      /* fall through */
    } else {
      return {
        candidate,
        decision: cached.decision,
        substitute: sub,
        reason: 'Decisión reutilizada desde caché contextual.',
        fromCache: true,
      }
    }
  }

  const context = localContext(tokens, candidate.tokenIndex)
  const decision = resolveDecision(entry, context, prev, opts)
  const substitute =
    decision === 'substitute'
      ? pickSubstitute(entry, opts.preferSimplest, null)
      : null

  if (decision !== 'evaluate') {
    decisionCache.set(entry.lemma, decision, substitute, prev, opts.modeId)
  }

  return {
    candidate,
    decision,
    substitute,
    reason: explain(entry, decision, opts),
    fromCache: false,
  }
}

export function evaluateAll(
  candidates: CandidateMatch[],
  tokens: TextToken[],
  opts: InterventionOptions = DEFAULT_OPTS,
): EvaluationResult[] {
  return candidates.map((c) => evaluateCandidate(c, tokens, opts))
}

function resolveDecision(
  entry: LexiconEntry,
  context: string,
  previous: string | null,
  opts: InterventionOptions,
): SubstitutionDecision {
  // «por ende» vigente → no tocar (reconocible)
  if (
    entry.lemma === 'ende' &&
    (previous === 'por' || /\bpor\s+ende\b/.test(context))
  ) {
    return 'preserve'
  }

  if (entry.defaultDecision === 'preserve' && !opts.includeLiterary) {
    return 'preserve'
  }

  // Modo 4: literario N1 también se simplifica si hay forma fácil / definición
  if (entry.defaultDecision === 'preserve' && opts.includeLiterary) {
    const easy = pickSubstitute(entry, true, null)
    return easy ? 'substitute' : 'glossary_only'
  }

  if (entry.defaultDecision === 'glossary_only') {
    // Rareza / sintéticas: nunca sustituir (evita «palabra poco frecuente»)
    if (entry.synthetic) return 'glossary_only'
    if (opts.forceSubstitute) {
      const easy = pickSubstitute(entry, opts.preferSimplest, null)
      return easy ? 'substitute' : 'glossary_only'
    }
    return 'glossary_only'
  }

  if (entry.defaultDecision === 'substitute') {
    const sub = pickSubstitute(entry, opts.preferSimplest, null)
    return sub ? 'substitute' : 'glossary_only'
  }

  // 'evaluate'
  const sub = pickSubstitute(entry, opts.preferSimplest, null)
  if (!sub) return 'glossary_only'

  if (!opts.preferSimplest) {
    const preferred = entry.preferredSubstitute?.toLowerCase()
    if (preferred && context.includes(preferred)) return 'glossary_only'
  }

  if (opts.forceSubstitute) return 'substitute'
  if (entry.level >= 3) return 'substitute'
  if (entry.notes?.toLowerCase().includes('conservar') && !opts.forceSubstitute) {
    return 'glossary_only'
  }
  return 'substitute'
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
  opts: InterventionOptions,
): string {
  switch (decision) {
    case 'substitute':
      return opts.preferSimplest
        ? `Modo simple: se expresa con palabras más fáciles.`
        : `Nivel ${entry.level}: alternativa que conserva el sentido.`
    case 'glossary_only':
      return `Nivel ${entry.level}: se conserva en el texto; se explica en el glosario.`
    case 'preserve':
      return `Nivel ${entry.level}: vocabulario literario/formal vigente; no intervenir.`
    case 'evaluate':
      return 'Pendiente de evaluación contextual más fina.'
  }
}
