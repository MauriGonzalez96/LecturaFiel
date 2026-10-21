import { useRef, useState } from 'react'
import type { GlossaryBookRecord } from '../glossary/types'
import type { GlossaryItem } from '../types/lexicon'

interface Props {
  /** Entradas del capítulo actual. */
  chapterItems: GlossaryItem[]
  /** Entradas acumuladas del libro activo (historial). */
  bookItems?: GlossaryItem[]
  bookTitle?: string
  /** Todos los libros del archivo JSON. */
  archive?: GlossaryBookRecord[]
  onDownload?: () => void
  onImportFile?: (file: File) => void | Promise<void>
  onRemoveArchiveBook?: (bookId: string) => void
}

type Scope = 'chapter' | 'book' | 'archive'

export function GlossaryPanel({
  chapterItems,
  bookItems = [],
  bookTitle,
  archive = [],
  onDownload,
  onImportFile,
  onRemoveArchiveBook,
}: Props) {
  const [scope, setScope] = useState<Scope>('chapter')
  const [archiveBookId, setArchiveBookId] = useState<string>(
    () => archive[0]?.bookId ?? '',
  )
  const fileRef = useRef<HTMLInputElement>(null)

  const archiveBook =
    archive.find((b) => b.bookId === archiveBookId) ?? archive[0]
  const items =
    scope === 'chapter'
      ? chapterItems
      : scope === 'book'
        ? bookItems
        : (archiveBook?.entries ?? [])

  return (
    <div className="glossary">
      <div className="glossary-toolbar">
        <div className="glossary-scopes" role="tablist" aria-label="Alcance del glosario">
          <button
            type="button"
            className={scope === 'chapter' ? 'tab active' : 'tab'}
            onClick={() => setScope('chapter')}
          >
            Capítulo ({chapterItems.length})
          </button>
          <button
            type="button"
            className={scope === 'book' ? 'tab active' : 'tab'}
            onClick={() => setScope('book')}
          >
            Este libro ({bookItems.length})
          </button>
          <button
            type="button"
            className={scope === 'archive' ? 'tab active' : 'tab'}
            onClick={() => setScope('archive')}
          >
            Archivo ({archive.length})
          </button>
        </div>
        <div className="glossary-actions">
          {onDownload && (
            <button
              type="button"
              className="btn ghost"
              onClick={onDownload}
              title="Descargar JSON con todos los libros"
            >
              Descargar JSON
            </button>
          )}
          {onImportFile && (
            <>
              <button
                type="button"
                className="btn ghost"
                onClick={() => fileRef.current?.click()}
              >
                Importar JSON
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void onImportFile(f)
                  e.target.value = ''
                }}
              />
            </>
          )}
        </div>
      </div>

      {scope === 'book' && bookTitle && (
        <p className="hint glossary-hint">
          Acumulado de «{bookTitle}» (se guarda aunque quites el libro de los
          slots).
        </p>
      )}

      {scope === 'archive' && (
        <div className="glossary-archive-pick">
          {archive.length === 0 ? (
            <p className="hint">Todavía no hay libros en el archivo de glosario.</p>
          ) : (
            <>
              <label className="chapter-select">
                Libro
                <select
                  value={archiveBook?.bookId ?? ''}
                  onChange={(e) => setArchiveBookId(e.target.value)}
                >
                  {archive.map((b) => (
                    <option key={b.bookId} value={b.bookId}>
                      {b.title} ({b.entries.length})
                    </option>
                  ))}
                </select>
              </label>
              {archiveBook && onRemoveArchiveBook && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => onRemoveArchiveBook(archiveBook.bookId)}
                >
                  Quitar del archivo
                </button>
              )}
            </>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="glossary empty">
          <p>
            {scope === 'chapter'
              ? 'Sin entradas en este capítulo. El glosario se llena cuando hay vocabulario difícil.'
              : 'Sin entradas todavía en este alcance.'}
          </p>
        </div>
      ) : (
        <ul className="glossary-list">
          {items.map((item) => (
            <li key={item.id} className={`glossary-item kind-${item.kind}`}>
              <header>
                <strong className="lemma">{item.word}</strong>
                <span className={`pill kind-${item.kind}`}>
                  {item.kind === 'substituted' ? 'Sustituida' : 'Conservada'}
                </span>
                <span className="pill level">N{item.level}</span>
              </header>
              <p className="def">{item.definition}</p>
              {item.audioExpression && (
                <p className="meta">
                  <span className="label">En el audio / texto</span>
                  {item.audioExpression}
                </p>
              )}
              <p className="meta quote">
                <span className="label">Frase original · cap. {item.chapter}</span>
                «{item.originalSentence}»
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
