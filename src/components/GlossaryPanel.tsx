import { useEffect, useRef, useState } from 'react'
import { openGlossaryWindow } from '../glossary/openGlossaryWindow'
import type { GlossaryBookRecord } from '../glossary/types'
import type { GlossaryItem } from '../types/lexicon'

interface Props {
  /** Entradas acumuladas del libro que se está leyendo. */
  bookItems?: GlossaryItem[]
  bookTitle?: string
  /** Todos los libros del archivo (glosario general). */
  archive?: GlossaryBookRecord[]
  /** Preferencia inicial: libro actual o general. */
  initialScope?: Scope
  onDownload?: () => void
  onImportFile?: (file: File) => void | Promise<void>
  onRemoveArchiveBook?: (bookId: string) => void
}

export type Scope = 'book' | 'general'

export function GlossaryPanel({
  bookItems = [],
  bookTitle,
  archive = [],
  initialScope = 'book',
  onDownload,
  onImportFile,
  onRemoveArchiveBook,
}: Props) {
  const [scope, setScope] = useState<Scope>(initialScope)
  const [popupError, setPopupError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setScope(initialScope)
  }, [initialScope])

  const generalCount = archive.reduce((n, b) => n + b.entries.length, 0)

  function openAside() {
    setPopupError(null)
    const ok = openGlossaryWindow({
      mode: scope === 'book' ? 'book' : 'general',
      bookTitle,
      bookItems,
      archive,
    })
    if (!ok) {
      setPopupError(
        'El navegador bloqueó la ventana. Permití ventanas emergentes para Lectura Fiel.',
      )
    }
  }

  return (
    <div className="glossary">
      <div className="glossary-toolbar">
        <div
          className="glossary-scopes"
          role="tablist"
          aria-label="Tipo de glosario"
        >
          <button
            type="button"
            className={scope === 'book' ? 'tab active' : 'tab'}
            onClick={() => setScope('book')}
          >
            Este libro ({bookItems.length})
          </button>
          <button
            type="button"
            className={scope === 'general' ? 'tab active' : 'tab'}
            onClick={() => setScope('general')}
          >
            General ({generalCount})
          </button>
        </div>
        <div className="glossary-actions">
          <button
            type="button"
            className="btn ghost"
            onClick={openAside}
            title="Abre el glosario en otra ventana (el audio sigue)"
          >
            Abrir en ventana
          </button>
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

      {popupError && (
        <p className="upload-error" role="alert">
          {popupError}
        </p>
      )}

      {scope === 'book' ? (
        <>
          <p className="hint glossary-hint">
            {bookTitle
              ? `Palabras difíciles de «${bookTitle}» (se acumulan al leer).`
              : 'Abrí un libro para ver su glosario acumulado.'}
            {' '}
            Podés abrir una ventana aparte sin cortar el audio.
          </p>
          <GlossaryList
            items={bookItems}
            empty="Todavía no hay entradas en este libro. Aparecen al leer capítulos con vocabulario difícil."
          />
        </>
      ) : (
        <>
          <p className="hint glossary-hint">
            Glosario general: todo lo archivado, separado por libro. Incluye
            libros que ya no estén en los slots.
          </p>
          {archive.length === 0 ? (
            <div className="glossary empty">
              <p>Todavía no hay libros en el archivo de glosario.</p>
            </div>
          ) : (
            <div className="glossary-general">
              {archive.map((book) => (
                <section key={book.bookId} className="glossary-book-block">
                  <div className="glossary-book-head">
                    <h3>
                      {book.title}{' '}
                      <span className="glossary-book-count">
                        ({book.entries.length})
                      </span>
                    </h3>
                    {onRemoveArchiveBook && (
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => onRemoveArchiveBook(book.bookId)}
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  <p className="hint glossary-book-meta">
                    {book.sourceName} · {book.format}
                  </p>
                  <GlossaryList
                    items={book.entries}
                    empty="Sin entradas en este libro."
                  />
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function GlossaryList({
  items,
  empty,
}: {
  items: GlossaryItem[]
  empty: string
}) {
  if (items.length === 0) {
    return (
      <div className="glossary empty">
        <p>{empty}</p>
      </div>
    )
  }

  return (
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
  )
}
