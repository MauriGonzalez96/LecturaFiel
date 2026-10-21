import { useState } from 'react'
import type { IngestedBook } from '../ingest/types'

interface Props {
  book: IngestedBook
  chapterIndex: number
  onSelectChapter: (index: number) => void
  onClear: () => void
}

export function BookNav({
  book,
  chapterIndex,
  onSelectChapter,
  onClear,
}: Props) {
  const [jumpValue, setJumpValue] = useState('')
  const [jumpError, setJumpError] = useState<string | null>(null)

  const hasPages = book.chapters.some((c) => c.pageFrom != null)
  const maxPage = hasPages
    ? Math.max(...book.chapters.map((c) => c.pageTo ?? c.pageFrom ?? 0))
    : book.chapters.length
  const current = book.chapters[chapterIndex]
  const jumpLabel = hasPages ? 'Ir a página' : 'Ir a capítulo / sección'
  const selectLabel = hasPages
    ? book.chapters.some((c) => (c.pageTo ?? 0) > (c.pageFrom ?? 0))
      ? 'Elegir sección / capítulo'
      : 'Elegir página'
    : 'Elegir capítulo'

  function handleJump(e: React.FormEvent) {
    e.preventDefault()
    setJumpError(null)
    const n = Number.parseInt(jumpValue, 10)
    if (!Number.isFinite(n) || n < 1) {
      setJumpError('Ingresá un número válido.')
      return
    }

    let index = -1
    if (hasPages) {
      index = book.chapters.findIndex(
        (c) =>
          c.pageFrom != null &&
          c.pageTo != null &&
          n >= c.pageFrom &&
          n <= c.pageTo,
      )
      if (index < 0) {
        setJumpError(`No hay página ${n} (1–${maxPage}).`)
        return
      }
    } else {
      if (n > book.chapters.length) {
        setJumpError(`No hay sección ${n} (1–${book.chapters.length}).`)
        return
      }
      index = n - 1
    }

    onSelectChapter(index)
    setJumpValue('')
  }

  const pageFrom = current?.pageFrom ?? chapterIndex + 1
  const pageTo = current?.pageTo ?? pageFrom
  const chapterInfo =
    current?.chapterLabel ??
    (hasPages ? null : current?.title ?? `Sección ${chapterIndex + 1}`)

  return (
    <div className="book-nav">
      <div className="book-nav-head">
        <div>
          <p className="book-format">{book.format.toUpperCase()}</p>
          <h3 className="book-title">{book.title}</h3>
          <p className="book-source">{book.sourceName}</p>
        </div>
        <button type="button" className="btn ghost" onClick={onClear}>
          Quitar libro
        </button>
      </div>

      <div className="where-am-i" aria-live="polite">
        {hasPages ? (
          <>
            <p className="where-page">
              {pageFrom === pageTo ? (
                <>
                  Estás en la <strong>página {pageFrom}</strong> de {maxPage}
                </>
              ) : (
                <>
                  Estás en las <strong>páginas {pageFrom}–{pageTo}</strong> de{' '}
                  {maxPage}
                </>
              )}
            </p>
            {chapterInfo && (
              <p className="where-chapter">
                Sección actual:{' '}
                <strong>
                  {current?.literaryChapter
                    ? `${current.literaryChapter}. `
                    : ''}
                  {chapterInfo}
                </strong>
              </p>
            )}
          </>
        ) : (
          <p className="where-page">
            Estás en{' '}
            <strong>
              {current?.title ?? `sección ${chapterIndex + 1}`}
            </strong>{' '}
            ({chapterIndex + 1} de {book.chapters.length})
          </p>
        )}
      </div>

      {book.chapters.length > 1 && (
        <>
          <label className="chapter-select">
            {selectLabel}
            <select
              value={chapterIndex}
              onChange={(e) => onSelectChapter(Number(e.target.value))}
            >
              {book.chapters.map((ch, i) => (
                <option key={`${ch.number}-${i}`} value={i}>
                  {formatOption(ch, hasPages)}
                </option>
              ))}
            </select>
          </label>

          <form className="jump-form" onSubmit={handleJump}>
            <label>
              {jumpLabel}
              <span className="jump-row">
                <input
                  type="number"
                  min={1}
                  max={maxPage}
                  placeholder={hasPages ? `ej. 42` : `1–${book.chapters.length}`}
                  value={jumpValue}
                  onChange={(e) => {
                    setJumpValue(e.target.value)
                    setJumpError(null)
                  }}
                />
                <button type="submit" className="btn primary">
                  Ir
                </button>
              </span>
            </label>
            {jumpError && <p className="upload-error">{jumpError}</p>}
          </form>
        </>
      )}
    </div>
  )
}

function formatOption(
  ch: IngestedBook['chapters'][number],
  hasPages: boolean,
): string {
  if (hasPages) {
    const from = ch.pageFrom ?? ch.number
    const to = ch.pageTo ?? from
    const page = from === to ? `Pág. ${from}` : `Págs. ${from}–${to}`
    if (ch.chapterLabel && ch.chapterLabel !== 'Inicio / preliminares') {
      const short =
        ch.chapterLabel.length > 36
          ? `${ch.chapterLabel.slice(0, 33)}…`
          : ch.chapterLabel
      return `${page} · ${short}`
    }
    return ch.title.length > 60 ? `${ch.title.slice(0, 57)}…` : ch.title || page
  }
  return ch.title.length > 60 ? `${ch.title.slice(0, 57)}…` : ch.title
}
