import { useCallback, useEffect, useRef, useState } from 'react'
import type { IngestedBook } from '../ingest/types'
import {
  emptyLibraryState,
  loadLibraryState,
  saveLibraryState,
} from './storage'
import {
  MAX_LIBRARY_SLOTS,
  type LibrarySlot,
  type LibraryState,
} from './types'

const SAVE_DEBOUNCE_MS = 700

export function useLibrary() {
  const [state, setState] = useState<LibraryState>(emptyLibraryState)
  const [ready, setReady] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const lastSavedJson = useRef<string | null>(null)
  const skipNextSave = useRef(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const loaded = await loadLibraryState()
      if (cancelled) return
      if (loaded) {
        setState(loaded)
        lastSavedJson.current = JSON.stringify(loaded)
      } else {
        lastSavedJson.current = JSON.stringify(emptyLibraryState())
      }
      skipNextSave.current = true
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    const json = JSON.stringify(state)
    if (json === lastSavedJson.current) return

    let cancelled = false
    setSaving(true)
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          await saveLibraryState(state)
          if (cancelled) return
          lastSavedJson.current = json
          setSaveError(null)
        } catch (err) {
          if (cancelled) return
          setSaveError(
            err instanceof Error
              ? err.message
              : 'No se pudo guardar el progreso de la biblioteca.',
          )
        } finally {
          if (!cancelled) setSaving(false)
        }
      })()
    }, SAVE_DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [state, ready])

  const activeSlot =
    state.slots.find((s) => s.book.id === state.activeBookId) ?? null

  const addOrOpenBook = useCallback((book: IngestedBook) => {
    setState((prev) => {
      const existing = prev.slots.findIndex((s) => s.book.id === book.id)
      const now = new Date().toISOString()

      if (existing >= 0) {
        const slots = [...prev.slots]
        const prevSlot = slots[existing]!
        const chapterIndex = Math.min(
          prevSlot.chapterIndex,
          Math.max(0, book.chapters.length - 1),
        )
        slots[existing] = {
          book,
          chapterIndex,
          sentenceIndex: prevSlot.sentenceIndex ?? 0,
          updatedAt: now,
        }
        return { ...prev, slots, activeBookId: book.id }
      }

      if (prev.slots.length >= MAX_LIBRARY_SLOTS) {
        return prev
      }

      const slot: LibrarySlot = {
        book,
        chapterIndex: 0,
        sentenceIndex: 0,
        updatedAt: now,
      }
      return {
        ...prev,
        slots: [...prev.slots, slot],
        activeBookId: book.id,
      }
    })
  }, [])

  const canAddBook = state.slots.length < MAX_LIBRARY_SLOTS

  const isBookOpen = useCallback(
    (bookId: string) => state.slots.some((s) => s.book.id === bookId),
    [state.slots],
  )

  const setActiveBook = useCallback((bookId: string | null) => {
    setState((prev) => ({ ...prev, activeBookId: bookId }))
  }, [])

  const setChapterIndex = useCallback((bookId: string, chapterIndex: number) => {
    setState((prev) => ({
      ...prev,
      slots: prev.slots.map((s) =>
        s.book.id === bookId
          ? {
              ...s,
              chapterIndex: Math.max(
                0,
                Math.min(chapterIndex, s.book.chapters.length - 1),
              ),
              sentenceIndex: 0,
              updatedAt: new Date().toISOString(),
            }
          : s,
      ),
      activeBookId: bookId,
    }))
  }, [])

  const setSentenceIndex = useCallback((bookId: string, sentenceIndex: number) => {
    setState((prev) => ({
      ...prev,
      slots: prev.slots.map((s) =>
        s.book.id === bookId
          ? {
              ...s,
              sentenceIndex: Math.max(0, Math.floor(sentenceIndex)),
              updatedAt: new Date().toISOString(),
            }
          : s,
      ),
    }))
  }, [])

  const removeBook = useCallback((bookId: string) => {
    setState((prev) => {
      const slots = prev.slots.filter((s) => s.book.id !== bookId)
      const activeBookId =
        prev.activeBookId === bookId
          ? (slots[0]?.book.id ?? null)
          : prev.activeBookId
      return { ...prev, slots, activeBookId }
    })
  }, [])

  const clearLibrary = useCallback(() => {
    setState(emptyLibraryState())
  }, [])

  const dismissSaveError = useCallback(() => setSaveError(null), [])

  return {
    ready,
    slots: state.slots,
    activeBookId: state.activeBookId,
    activeSlot,
    canAddBook,
    isBookOpen,
    addOrOpenBook,
    setActiveBook,
    setChapterIndex,
    setSentenceIndex,
    removeBook,
    clearLibrary,
    maxSlots: MAX_LIBRARY_SLOTS,
    saveError,
    saving,
    dismissSaveError,
  }
}
