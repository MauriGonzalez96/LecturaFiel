import { useCallback, useEffect, useState } from 'react'
import type { GlossaryItem } from '../types/lexicon'
import { mergeBookEntries, type BookMeta } from './mergeEntries'
import {
  emptyVault,
  type GlossaryBookRecord,
  type GlossaryVaultFile,
} from './types'
import {
  loadVault,
  parseVaultJson,
  saveVault,
  vaultToJson,
} from './vaultStorage'

export function useGlossaryVault() {
  const [vault, setVault] = useState<GlossaryVaultFile>(emptyVault)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const loaded = await loadVault()
      if (!cancelled) {
        setVault(loaded)
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback(async (next: GlossaryVaultFile) => {
    setVault(next)
    try {
      await saveVault(next)
      setError(null)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el archivo de glosario.',
      )
    }
  }, [])

  const mergeChapter = useCallback(
    (meta: BookMeta, entries: GlossaryItem[]) => {
      setVault((prev) => {
        const next = mergeBookEntries(prev, meta, entries)
        if (next === prev) return prev
        // Misma referencia de contenido: comparar JSON liviano
        if (
          next.books.length === prev.books.length &&
          JSON.stringify(next.books) === JSON.stringify(prev.books)
        ) {
          return prev
        }
        void saveVault(next).catch((err) => {
          setError(
            err instanceof Error
              ? err.message
              : 'No se pudo guardar el archivo de glosario.',
          )
        })
        return next
      })
    },
    [],
  )

  const getBook = useCallback(
    (bookId: string): GlossaryBookRecord | undefined =>
      vault.books.find((b) => b.bookId === bookId),
    [vault.books],
  )

  const downloadJson = useCallback(() => {
    const blob = new Blob([vaultToJson(vault)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lectura-fiel-glosario-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [vault])

  const importJson = useCallback(
    async (file: File) => {
      const raw = await file.text()
      const parsed = parseVaultJson(raw)
      // Merge por bookId
      let next = vault
      for (const book of parsed.books) {
        next = mergeBookEntries(
          next,
          {
            bookId: book.bookId,
            title: book.title,
            sourceName: book.sourceName,
            format: book.format,
          },
          book.entries,
        )
      }
      await persist(next)
    },
    [persist, vault],
  )

  const removeBook = useCallback(
    async (bookId: string) => {
      const next: GlossaryVaultFile = {
        ...vault,
        updatedAt: new Date().toISOString(),
        books: vault.books.filter((b) => b.bookId !== bookId),
      }
      await persist(next)
    },
    [persist, vault],
  )

  return {
    ready,
    vault,
    error,
    mergeChapter,
    getBook,
    downloadJson,
    importJson,
    removeBook,
  }
}
