const KEY = 'lektor:heard-summaries'

function readAll(): Record<string, number[]> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, number[]>
  } catch {
    return {}
  }
}

function writeAll(data: Record<string, number[]>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

export function markSummaryHeard(bookId: string, chapterIndex: number): void {
  const all = readAll()
  const list = new Set(all[bookId] ?? [])
  list.add(chapterIndex)
  all[bookId] = [...list].sort((a, b) => a - b)
  writeAll(all)
}

export function heardSummaryIndexes(bookId: string): Set<number> {
  return new Set(readAll()[bookId] ?? [])
}
