import type { GlossaryItem } from '../types/lexicon'
import type { GlossaryBookRecord, GlossaryVaultFile } from './types'

export interface BookMeta {
  bookId: string
  title: string
  sourceName: string
  format: GlossaryBookRecord['format']
}

/**
 * Incorpora entradas del capítulo al libro en el vault (por lema, sin duplicar).
 * Si no hay lemas nuevos, devuelve el mismo objeto `vault`.
 */
export function mergeBookEntries(
  vault: GlossaryVaultFile,
  meta: BookMeta,
  incoming: GlossaryItem[],
): GlossaryVaultFile {
  if (incoming.length === 0) return vault

  const idx = vault.books.findIndex((b) => b.bookId === meta.bookId)
  const now = new Date().toISOString()

  if (idx < 0) {
    return {
      ...vault,
      updatedAt: now,
      books: [
        {
          bookId: meta.bookId,
          title: meta.title,
          sourceName: meta.sourceName,
          format: meta.format,
          updatedAt: now,
          entries: dedupeByLemma(incoming),
        },
        ...vault.books,
      ],
    }
  }

  const prev = vault.books[idx]!
  const map = new Map(prev.entries.map((e) => [e.lemma, e]))
  let added = 0
  for (const item of incoming) {
    if (!map.has(item.lemma)) {
      map.set(item.lemma, item)
      added += 1
    }
  }
  if (added === 0) return vault

  const books = [...vault.books]
  books[idx] = {
    ...prev,
    title: meta.title || prev.title,
    sourceName: meta.sourceName || prev.sourceName,
    format: meta.format || prev.format,
    updatedAt: now,
    entries: [...map.values()].sort((a, b) =>
      a.lemma.localeCompare(b.lemma, 'es'),
    ),
  }

  return {
    ...vault,
    updatedAt: now,
    books: books.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  }
}

function dedupeByLemma(items: GlossaryItem[]): GlossaryItem[] {
  const map = new Map<string, GlossaryItem>()
  for (const item of items) {
    if (!map.has(item.lemma)) map.set(item.lemma, item)
  }
  return [...map.values()].sort((a, b) => a.lemma.localeCompare(b.lemma, 'es'))
}
