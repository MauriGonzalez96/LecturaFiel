import {
  isCommonSpanish,
  RARITY_MIN_LENGTH,
  stripDiacritics,
} from '../data/commonSpanish'
import { lookupEasySynonym } from '../data/easySynonyms'
import type { LexiconEntry, TextToken } from '../types/lexicon'

/**
 * Entrada para palabras fuera del léxico semilla.
 * Si hay sinónimo fácil curado → se puede sustituir.
 * Si no → solo glosario (nunca inventar «palabra poco frecuente»).
 */
export function rarityEntry(normalized: string): LexiconEntry {
  const lemma = stripDiacritics(normalized)
  const easy = lookupEasySynonym(normalized)

  if (easy) {
    return {
      lemma,
      forms: [normalized],
      level: 2,
      definition:
        easy.definition ??
        `Forma más clara sugerida: «${easy.simple}».`,
      preferredSubstitute: easy.preferred,
      simpleSubstitute: easy.simple,
      defaultDecision: 'substitute',
      synthetic: false,
      notes: 'Sinónimo fácil (mapa de rareza).',
    }
  }

  return {
    lemma,
    forms: [normalized],
    level: 2,
    definition:
      'Palabra poco frecuente en el uso cotidiano (detección por rareza). Conservada en el texto; conviene confirmar el sentido en contexto.',
    preferredSubstitute: null,
    simpleSubstitute: null,
    defaultDecision: 'glossary_only',
    synthetic: true,
    notes: 'Candidata por frecuencias de referencia, no por léxico semilla.',
  }
}

/** Evita marcar nombres propios a mitad de frase. */
export function isLikelyProperNoun(
  token: TextToken,
  tokens: TextToken[],
  index: number,
): boolean {
  const first = token.raw[0]
  if (!first || first !== first.toUpperCase() || first === first.toLowerCase()) {
    return false
  }
  if (index === 0) return false
  for (let i = index - 1; i >= 0; i--) {
    const prev = tokens[i]!
    if (prev.isWord) {
      return true
    }
    if (/[.!?…»]/.test(prev.raw)) return false
  }
  return false
}

/**
 * ¿Debe considerarse candidata por rareza?
 */
export function looksRare(
  token: TextToken,
  tokens: TextToken[],
  index: number,
): boolean {
  const normalized = token.normalized
  if (normalized.length < RARITY_MIN_LENGTH) return false
  if (/\d/.test(normalized)) return false
  if (isCommonSpanish(normalized)) return false
  if (isLikelyProperNoun(token, tokens, index)) return false
  return true
}
