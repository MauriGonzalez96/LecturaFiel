import type {
  GlossaryItem,
  PipelineResult,
  SubstitutionEvent,
} from '../types/lexicon'

/** Concepto difícil del capítulo, para tejerlo en la explicación IA. */
export type SummaryConcept = {
  /** Palabra o lema del autor. */
  term: string
  /** Cómo suena en el texto adaptado (si hubo intercambio). */
  plain?: string
  definition?: string
  /** Oración donde aparece / se usa. */
  context?: string
}

const MAX_CONCEPTS = 28

/**
 * Arma la lista de conceptos a partir del pipeline (intercambios + glosario).
 */
export function conceptsFromPipeline(result: PipelineResult): SummaryConcept[] {
  const byKey = new Map<string, SummaryConcept>()

  const upsert = (c: SummaryConcept) => {
    const key = c.term.trim().toLowerCase()
    if (!key) return
    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, c)
      return
    }
    byKey.set(key, {
      term: prev.term || c.term,
      plain: prev.plain || c.plain,
      definition: longer(prev.definition, c.definition),
      context: longer(prev.context, c.context),
    })
  }

  for (const s of result.substitutions) {
    upsert(fromSubstitution(s))
  }
  for (const g of result.glossary) {
    upsert(fromGlossary(g))
  }

  return [...byKey.values()]
    .sort((a, b) => a.term.localeCompare(b.term, 'es'))
    .slice(0, MAX_CONCEPTS)
}

export function formatConceptsForPrompt(concepts: SummaryConcept[]): string {
  if (concepts.length === 0) return ''
  const lines = concepts.map((c) => {
    const bits = [`- «${c.term}»`]
    if (c.plain && c.plain.toLowerCase() !== c.term.toLowerCase()) {
      bits.push(`(en el texto adaptado: «${c.plain}»)`)
    }
    if (c.definition?.trim()) bits.push(`— ${c.definition.trim()}`)
    if (c.context?.trim()) {
      bits.push(`\n  Contexto: «${shorten(c.context.trim(), 220)}»`)
    }
    return bits.join(' ')
  })
  return (
    `Conceptos difíciles de este capítulo (intercambiados o en glosario). ` +
    `Integrálos en la narración: presentá cada uno, explicá qué significa y en qué contexto lo usa el autor.\n` +
    lines.join('\n')
  )
}

function fromSubstitution(s: SubstitutionEvent): SummaryConcept {
  return {
    term: s.original || s.entry.lemma,
    plain: s.replacement,
    definition: s.entry.definition,
  }
}

function fromGlossary(g: GlossaryItem): SummaryConcept {
  return {
    term: g.word || g.lemma,
    plain: g.audioExpression,
    definition: g.definition,
    context: g.originalSentence,
  }
}

function longer(a?: string, b?: string): string | undefined {
  const aa = a?.trim() ?? ''
  const bb = b?.trim() ?? ''
  if (!aa) return bb || undefined
  if (!bb) return aa || undefined
  return aa.length >= bb.length ? aa : bb
}

function shorten(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}
