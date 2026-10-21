import type { DecisionCacheRecord, SubstitutionDecision } from '../types/lexicon'

const STORAGE_KEY = 'lectura-fiel:decision-cache'

/** Clave: modo|lema|prev — el modo evita mezclar decisiones entre niveles 1–4. */
export function cacheKey(
  lemma: string,
  previousWord?: string | null,
  modeId?: string,
): string {
  const prev = previousWord?.trim().toLowerCase() || ''
  const mode = modeId || '3'
  if (!prev) return `${mode}|${lemma}`
  return `${mode}|${lemma}|${prev}`
}

export class DecisionCache {
  private map = new Map<string, DecisionCacheRecord>()

  constructor() {
    this.load()
  }

  get(
    lemma: string,
    previousWord?: string | null,
    modeId?: string,
  ): DecisionCacheRecord | undefined {
    return this.map.get(cacheKey(lemma, previousWord, modeId))
  }

  set(
    lemma: string,
    decision: SubstitutionDecision,
    substitute?: string | null,
    previousWord?: string | null,
    modeId?: string,
  ): void {
    const key = cacheKey(lemma, previousWord, modeId)
    const record: DecisionCacheRecord = {
      lemma: key,
      decision,
      substitute,
      contextHint: previousWord?.trim().toLowerCase() || undefined,
      updatedAt: new Date().toISOString(),
    }
    this.map.set(key, record)
    this.persist()
  }

  clear(): void {
    this.map.clear()
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }

  entries(): DecisionCacheRecord[] {
    return [...this.map.values()]
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as DecisionCacheRecord[]
      for (const r of parsed) this.map.set(r.lemma, r)
    } catch {
      /* ignore corrupt cache */
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries()))
    } catch {
      /* ignore quota */
    }
  }
}

export const decisionCache = new DecisionCache()
