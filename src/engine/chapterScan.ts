import { isEverydayWord, OUTLIER_MIN_LENGTH } from '../data/everydayVocabulary'
import type { LexiconEntry } from '../types/lexicon'
import { isLikelyProperNoun } from './rarity'
import { resolveOutsideEveryday } from './resolveOutsideEveryday'
import { tokenize } from './tokenizer'

export interface ChapterOutlier {
  normalized: string
  count: number
  entry: LexiconEntry
  /** true si tenemos sinónimo para reemplazar */
  canReplace: boolean
}

export interface ChapterScanResult {
  wordsTotal: number
  everydayCount: number
  outliers: ChapterOutlier[]
  replaceableCount: number
  glossaryOnlyCount: number
}

/**
 * Por capítulo: parte de lo cotidiano y busca lo que no lo es.
 */
export function scanChapterOutsideEveryday(text: string): ChapterScanResult {
  const tokens = tokenize(text)
  const counts = new Map<string, number>()
  let wordsTotal = 0
  let everydayCount = 0

  tokens.forEach((token, index) => {
    if (!token.isWord) return
    wordsTotal += 1
    const n = token.normalized
    if (n.length < OUTLIER_MIN_LENGTH) {
      everydayCount += 1
      return
    }
    if (/\d/.test(n)) {
      everydayCount += 1
      return
    }
    if (isEverydayWord(n)) {
      everydayCount += 1
      return
    }
    if (isLikelyProperNoun(token, tokens, index)) {
      everydayCount += 1
      return
    }
    counts.set(n, (counts.get(n) ?? 0) + 1)
  })

  const outliers: ChapterOutlier[] = []
  for (const [normalized, count] of counts) {
    const entry = resolveOutsideEveryday(normalized)
    const canReplace = Boolean(
      entry.preferredSubstitute || entry.simpleSubstitute,
    )
    outliers.push({ normalized, count, entry, canReplace })
  }

  outliers.sort((a, b) => b.count - a.count || a.normalized.localeCompare(b.normalized))

  return {
    wordsTotal,
    everydayCount,
    outliers,
    replaceableCount: outliers.filter((o) => o.canReplace).length,
    glossaryOnlyCount: outliers.filter((o) => !o.canReplace).length,
  }
}
