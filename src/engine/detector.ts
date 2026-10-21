import { buildFormIndex, SEED_LEXICON } from '../data/lexicon'
import type { InterventionOptions } from '../settings/intervention'
import type { CandidateMatch, LexiconEntry, TextToken } from '../types/lexicon'
import { looksRare, rarityEntry } from './rarity'
import { tokenize } from './tokenizer'

export interface DetectResult {
  tokens: TextToken[]
  candidates: CandidateMatch[]
  rarityCount: number
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
 * Etapa 1 — detectar candidatas según nivel de reemplazo 1–4.
 */
export function detectCandidates(
  text: string,
  lexicon: LexiconEntry[] = SEED_LEXICON,
  opts: InterventionOptions = DEFAULT_OPTS,
): DetectResult {
  const index = buildFormIndex(lexicon)
  const tokens = tokenize(text)
  const candidates: CandidateMatch[] = []
  let rarityCount = 0
  const minLevel = opts.minLevel

  tokens.forEach((token, tokenIndex) => {
    if (!token.isWord) return

    const entry = index.get(token.normalized)
    if (entry) {
      if (entry.level < minLevel) return
      // N1 solo si el modo lo pide (includeLiterary / minLevel 1)
      if (entry.level === 1 && !opts.includeLiterary && minLevel > 1) return
      candidates.push({ tokenIndex, token, entry })
      return
    }

    if (!opts.includeRarity) return
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
