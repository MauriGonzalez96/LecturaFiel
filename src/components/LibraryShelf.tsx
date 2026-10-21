import type { LibrarySlot } from '../library/types'
import { MAX_LIBRARY_SLOTS } from '../library/types'

interface Props {
  slots: LibrarySlot[]
  activeBookId: string | null
  onSelect: (bookId: string) => void
  onRemove: (bookId: string) => void
  onDemo?: () => void
}

export function LibraryShelf({
  slots,
  activeBookId,
  onSelect,
  onRemove,
  onDemo,
}: Props) {
  const emptyCount = MAX_LIBRARY_SLOTS - slots.length

  return (
    <div className="library-shelf">
      <div className="library-shelf-head">
        <h3>Biblioteca</h3>
        <span className="library-count">
          {slots.length}/{MAX_LIBRARY_SLOTS} libros
        </span>
      </div>

      <div className="library-slots">
        {slots.map((slot) => {
          const ch = slot.book.chapters[slot.chapterIndex]
          const active = slot.book.id === activeBookId
          const hasPages = slot.book.chapters.some((c) => c.pageFrom != null)
          return (
            <div
              key={slot.book.id}
              className={`library-slot${active ? ' active' : ''}`}
            >
              <button
                type="button"
                className="library-slot-main"
                onClick={() => onSelect(slot.book.id)}
              >
                <span className="slot-format">
                  {slot.book.format.toUpperCase()}
                </span>
                <span className="slot-title">{slot.book.title}</span>
                <span className="slot-progress">
                  {hasPages
                    ? `Pág. ${ch?.pageFrom ?? slot.chapterIndex + 1}/${slot.book.chapters.length}`
                    : `Cap. ${slot.chapterIndex + 1}/${slot.book.chapters.length}`}
                  {ch?.chapterLabel
                    ? ` · ${truncate(ch.chapterLabel, 28)}`
                    : ch
                      ? ` · ${truncate(ch.title, 28)}`
                      : ''}
                </span>
              </button>
              <button
                type="button"
                className="btn ghost slot-remove"
                title="Quitar de la biblioteca"
                onClick={() => onRemove(slot.book.id)}
              >
                ×
              </button>
            </div>
          )
        })}

        {Array.from({ length: emptyCount }).map((_, i) => (
          <div key={`empty-${i}`} className="library-slot empty">
            <span className="slot-empty-label">Slot libre</span>
          </div>
        ))}
      </div>

      {!activeBookId && slots.length === 0 && (
        <p className="library-hint">Subí un libro para ocupar un slot.</p>
      )}

      {!activeBookId && slots.length > 0 && (
        <p className="library-hint">
          Elegí un libro de la biblioteca o subí uno nuevo.
        </p>
      )}

      {onDemo && activeBookId && (
        <button type="button" className="btn ghost library-demo" onClick={onDemo}>
          Ver demo (solo desarrollo)
        </button>
      )}
    </div>
  )
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s
}
