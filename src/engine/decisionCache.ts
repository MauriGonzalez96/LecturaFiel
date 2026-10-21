import type { DecisionCacheRecord, SubstitutionDecision } from '../types/lexicon'

const STORAGE_KEY = 'lectura-fiel:decision-cache'

/** Clave contextual: lema + palabra previa (desambiguación mínima). */
export function cacheKey(lemma: string, previousWord?: string | null): string {
  const prev = previousWord?.trim().toLowerCase()
  if (!prev) return lemma
  return `${lemma}|${prev}`
}

/**
 * Guarda decisiones ya tomadas. La clave incluye contexto previo cuando existe,
 * para no congelar un lema polisémico en todos los entornos.
 */
export class DecisionCache {
  private map = new Map<string, DecisionCacheRecord>()

  constructor() {
    this.load()
  }

  get(
    lemma: string,
    previousWord?: string | null,
  ): DecisionCacheRecord | undefined {
    const contextual = cacheKey(lemma, previousWord)
    const hit = this.map.get(contextual)
    if (hit) return hit
    // Compatibilidad con cachés antiguas (solo lema)
    if (previousWord) return this.map.get(lemma)
    return undefined
  }

  set(
    lemma: string,
    decision: SubstitutionDecision,
    substitute?: string | null,
    previousWord?: string | null,
  ): void {
    const key = cacheKey(lemma, previousWord)
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
