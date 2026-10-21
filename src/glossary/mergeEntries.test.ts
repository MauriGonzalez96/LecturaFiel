import { describe, expect, it } from 'vitest'
import type { GlossaryItem } from '../types/lexicon'
import { mergeBookEntries } from './mergeEntries'
import { emptyVault } from './types'

function entry(lemma: string, chapter = 1): GlossaryItem {
  return {
    id: `${chapter}-${lemma}`,
    word: lemma,
    lemma,
    definition: `def ${lemma}`,
    kind: 'substituted',
    originalSentence: `frase ${lemma}`,
    chapter,
    level: 3,
  }
}

describe('mergeBookEntries', () => {
  it('acumula lemas de varios capítulos sin duplicar', () => {
    let vault = emptyVault()
    const meta = {
      bookId: 'b1',
      title: 'Libro',
      sourceName: 'libro.epub',
      format: 'epub' as const,
    }
    vault = mergeBookEntries(vault, meta, [entry('empero', 1)])
    vault = mergeBookEntries(vault, meta, [
      entry('empero', 2),
      entry('hogaño', 2),
    ])
    expect(vault.books).toHaveLength(1)
    expect(vault.books[0]!.entries.map((e) => e.lemma).sort()).toEqual([
      'empero',
      'hogaño',
    ])
  })

  it('guarda varios libros en el mismo archivo', () => {
    let vault = emptyVault()
    vault = mergeBookEntries(
      vault,
      {
        bookId: 'a',
        title: 'A',
        sourceName: 'a.txt',
        format: 'txt',
      },
      [entry('asaz')],
    )
    vault = mergeBookEntries(
      vault,
      {
        bookId: 'b',
        title: 'B',
        sourceName: 'b.txt',
        format: 'txt',
      },
      [entry('maguer')],
    )
    expect(vault.books).toHaveLength(2)
  })
})
