import {
  isEverydayWord,
  OUTLIER_MIN_LENGTH,
} from '../data/everydayVocabulary'
import type { TextToken } from '../types/lexicon'
import { resolveOutsideEveryday } from './resolveOutsideEveryday'

/**
 * Entrada para palabras fuera del vocabulario cotidiano del capítulo.
 * Busca sinónimo en léxico/arcaísmos/mapa fácil; si no hay, solo glosario.
 */
export function rarityEntry(normalized: string) {
  return resolveOutsideEveryday(normalized)
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
 * ¿Está fuera del uso cotidiano? (candidata a arcaica / difícil)
 */
export function looksRare(
  token: TextToken,
  tokens: TextToken[],
  index: number,
): boolean {
  const normalized = token.normalized
  if (normalized.length < OUTLIER_MIN_LENGTH) return false
  if (/\d/.test(normalized)) return false
  if (isEverydayWord(normalized)) return false
  if (isLikelyProperNoun(token, tokens, index)) return false
  return true
}

/** @deprecated usar OUTLIER_MIN_LENGTH */
export const RARITY_MIN_LENGTH = OUTLIER_MIN_LENGTH
