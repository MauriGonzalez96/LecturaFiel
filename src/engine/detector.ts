import { buildFormIndex, SEED_LEXICON } from '../data/lexicon'
import type { CandidateMatch, LexiconEntry, TextToken } from '../types/lexicon'
import { looksRare, rarityEntry } from './rarity'
import { tokenize } from './tokenizer'

export interface DetectResult {
  tokens: TextToken[]
  candidates: CandidateMatch[]
  /** Candidatas solo por rareza (fuera del léxico semilla). */
  rarityCount: number
}

/**
 * Etapa 1 — detectar palabras candidatas.
 * 1) Léxico semilla: solo niveles 2 y 3.
 * 2) Rareza: formas fuera del semilla y del vocabulario frecuente → N2 glossary_only.
 */
export function detectCandidates(
  text: string,
  lexicon: LexiconEntry[] = SEED_LEXICON,
): DetectResult {
  const index = buildFormIndex(lexicon)
  const tokens = tokenize(text)
  const candidates: CandidateMatch[] = []
  let rarityCount = 0

  tokens.forEach((token, tokenIndex) => {
    if (!token.isWord) return

    const entry = index.get(token.normalized)
    if (entry) {
      if (entry.level < 2) return
      candidates.push({ tokenIndex, token, entry })
      return
    }

    if (!looksRare(token, tokens, tokenIndex)) return
    rarityCount += 1
    candidates.push({
      tokenIndex,
      token,
      entry: rarityEntry(token.normalized),
    })
  })

  return { tokens, candidates, rarityCount }
}
