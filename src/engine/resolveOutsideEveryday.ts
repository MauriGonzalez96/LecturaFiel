import { lookupEasySynonym } from '../data/easySynonyms'
import { buildFormIndex, SEED_LEXICON, normalizeForm } from '../data/lexicon'
import { stripDiacritics } from '../data/everydayVocabulary'
import type { LexiconEntry } from '../types/lexicon'

const formIndex = buildFormIndex(SEED_LEXICON)

/** Índice lema/forma → entrada con sustituto (para variantes no exactas). */
const synonymForms = new Map<string, LexiconEntry>()
for (const entry of SEED_LEXICON) {
  if (!entry.preferredSubstitute && !entry.simpleSubstitute) continue
  synonymForms.set(normalizeForm(entry.lemma), entry)
  for (const f of entry.forms) synonymForms.set(normalizeForm(f), entry)
}

/**
 * Resuelve una palabra fuera del uso cotidiano:
 * 1) léxico / arcaísmos (por si el detector no la indexó igual)
 * 2) mapa de sinónimos fáciles
 * 3) si no hay reemplazo → solo glosario (nunca inventar basura)
 */
export function resolveOutsideEveryday(normalized: string): LexiconEntry {
  const key = normalizeForm(normalized)
  const fromLexicon = formIndex.get(key) ?? synonymForms.get(key)
  if (fromLexicon) return fromLexicon

  const easy = lookupEasySynonym(normalized)
  if (easy) {
    return {
      lemma: stripDiacritics(normalized),
      forms: [normalized],
      level: 2,
      definition:
        easy.definition ?? `Forma más clara sugerida: «${easy.simple}».`,
      preferredSubstitute: easy.preferred,
      simpleSubstitute: easy.simple,
      defaultDecision: 'substitute',
      synthetic: false,
      notes: 'Fuera de uso cotidiano; sinónimo del mapa fácil.',
    }
  }

  return {
    lemma: stripDiacritics(normalized),
    forms: [normalized],
    level: 2,
    definition:
      'Palabra fuera del vocabulario de uso cotidiano en este capítulo. Se conserva en el texto y se anota en el glosario hasta tener un sinónimo curado.',
    preferredSubstitute: null,
    simpleSubstitute: null,
    defaultDecision: 'glossary_only',
    synthetic: true,
    notes: 'Detectada por exclusión del vocabulario cotidiano.',
  }
}
