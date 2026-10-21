import { useEffect, useMemo, useState } from 'react'
import { SAMPLE_CHAPTER } from './data/sampleChapter'
import { runPipeline } from './engine/pipeline'
import { decisionCache } from './engine/decisionCache'
import { HighlightedText } from './components/HighlightedText'
import { GlossaryPanel } from './components/GlossaryPanel'
import { GlossaryQuiz } from './components/GlossaryQuiz'
import { StatsBar } from './components/StatsBar'
import { AudioPlayer } from './components/AudioPlayer'
import { ChangeLog } from './components/ChangeLog'
import { FileUpload } from './components/FileUpload'
import { BookNav } from './components/BookNav'
import { CloseAppButton } from './components/CloseAppButton'
import { LibraryShelf } from './components/LibraryShelf'
import { UpdateChecker } from './components/UpdateChecker'
import { VoiceStudio } from './components/VoiceStudio'
import { useLibrary } from './library/useLibrary'
import { useGlossaryVault } from './glossary/useGlossaryVault'
import { useVoiceSettings } from './hooks/useVoiceSettings'
import { MAX_LIBRARY_SLOTS } from './library/types'
import { DEMO_ENABLED } from './env'
import type { IngestedBook } from './ingest/types'
import { APP_VERSION_LABEL } from './version'

type Tab = 'adapted' | 'original' | 'glossary' | 'review' | 'voices'

export default function App() {
  const library = useLibrary()
  const glossaryVault = useGlossaryVault()
  useVoiceSettings()
  const [demoMode, setDemoMode] = useState(DEMO_ENABLED)
  const [demoText, setDemoText] = useState(SAMPLE_CHAPTER.text)
  const [tab, setTab] = useState<Tab>('adapted')
  const [cacheTick, setCacheTick] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const showDemo = DEMO_ENABLED && demoMode
  const active = !showDemo ? library.activeSlot : null
  const book = active?.book ?? null
  const chapterIndex = active?.chapterIndex ?? 0
  const chapterMeta = book?.chapters[chapterIndex]

  const chapter = showDemo
    ? SAMPLE_CHAPTER.number
    : (chapterMeta?.number ?? 1)
  const title = showDemo
    ? SAMPLE_CHAPTER.title
    : (chapterMeta?.title ?? (book ? book.title : 'Sin libro'))
  const text = showDemo
    ? demoText
    : (chapterMeta?.text ?? '')

  useEffect(() => {
    if (!library.ready) return
    if (library.activeBookId && library.activeSlot) {
      setDemoMode(false)
    }
  }, [library.ready, library.activeBookId, library.activeSlot])

  const result = useMemo(() => {
    void cacheTick
    if (!text.trim() && !showDemo) {
      return runPipeline('', 1)
    }
    return runPipeline(text, chapter)
  }, [text, chapter, cacheTick, showDemo])

  // Persistir glosario del capítulo en el archivo por libro
  useEffect(() => {
    if (!glossaryVault.ready) return
    if (showDemo || !book) return
    if (result.glossary.length === 0) return
    glossaryVault.mergeChapter(
      {
        bookId: book.id,
        title: book.title,
        sourceName: book.sourceName,
        format: book.format,
      },
      result.glossary,
    )
  }, [
    glossaryVault.ready,
    glossaryVault.mergeChapter,
    showDemo,
    book,
    result.glossary,
  ])

  const bookGlossary = book
    ? (glossaryVault.getBook(book.id)?.entries ?? [])
    : []
  const glossaryTabCount = Math.max(
    result.glossary.length,
    bookGlossary.length,
  )

  function handleBookIngested(next: IngestedBook) {
    setUploadError(null)

    if (library.isBookOpen(next.id)) {
      library.addOrOpenBook(next)
      setDemoMode(false)
      setTab('adapted')
      return
    }

    if (!library.canAddBook) {
      setUploadError(
        `Ya tenés ${MAX_LIBRARY_SLOTS} libros abiertos. Quitá uno de la biblioteca para agregar otro (el glosario archivado se conserva).`,
      )
      return
    }

    library.addOrOpenBook(next)
    setDemoMode(false)
    setTab('adapted')
  }

  function selectChapter(index: number) {
    if (!book) return
    library.setChapterIndex(book.id, index)
    setTab('adapted')
  }

  const hasNextChapter = Boolean(
    book && !showDemo && chapterIndex < book.chapters.length - 1,
  )
  const nextChapterMeta =
    book && hasNextChapter ? book.chapters[chapterIndex + 1] : undefined
  const nextChapterLabel = nextChapterMeta
    ? nextChapterMeta.title ||
      `Capítulo ${nextChapterMeta.number ?? chapterIndex + 2}`
    : undefined
  const currentChapterLabel = showDemo
    ? SAMPLE_CHAPTER.title
    : title || `Capítulo ${chapter}`

  function advanceChapter(): boolean {
    if (!book || showDemo) return false
    if (chapterIndex >= book.chapters.length - 1) return false
    library.setChapterIndex(book.id, chapterIndex + 1)
    setTab('adapted')
    return true
  }

  function goDemo() {
    if (!DEMO_ENABLED) return
    library.setActiveBook(null)
    setDemoMode(true)
    setDemoText(SAMPLE_CHAPTER.text)
    setTab('adapted')
  }

  function selectLibraryBook(bookId: string) {
    library.setActiveBook(bookId)
    setDemoMode(false)
    setTab('adapted')
    setUploadError(null)
  }

  function removeLibraryBook(bookId: string) {
    const wasLast = library.slots.length <= 1
    library.removeBook(bookId)
    setUploadError(null)
    if (wasLast) {
      setDemoMode(DEMO_ENABLED)
      if (DEMO_ENABLED) setDemoText(SAMPLE_CHAPTER.text)
    }
  }

  function clearCache() {
    decisionCache.clear()
    setCacheTick((n) => n + 1)
  }

  const emptyProduction = !DEMO_ENABLED && !book
  const reviewItems =
    bookGlossary.length > 0 ? bookGlossary : result.glossary

  return (
    <div className="app">
      <div className="atmosphere" aria-hidden="true" />

      <header className="top">
        <div className="top-row">
          <div className="brand-block">
            <p className="brand">Lectura Fiel</p>
            <h1>El mismo libro. Solo lo excepcional se adapta.</h1>
            <p className="lede">
              Hasta {MAX_LIBRARY_SLOTS} libros abiertos a la vez. El glosario se
              archiva por libro (sin tope) y se puede descargar en JSON.
            </p>
          </div>
          <div className="top-actions">
            <UpdateChecker />
            <CloseAppButton />
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="panel input-panel">
          <div className="panel-head">
            <h2>Fuente</h2>
            <div className="actions">
              {DEMO_ENABLED && (
                <button type="button" className="btn ghost" onClick={goDemo}>
                  Demo
                </button>
              )}
              <button
                type="button"
                className="btn ghost"
                onClick={() => setTab('voices')}
              >
                Voces
              </button>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setTab('glossary')}
              >
                Glosario
              </button>
              <button type="button" className="btn ghost" onClick={clearCache}>
                Limpiar caché léxica
              </button>
            </div>
          </div>

          {!library.ready ? (
            <p className="hint">Cargando biblioteca…</p>
          ) : (
            <LibraryShelf
              slots={library.slots}
              activeBookId={showDemo ? null : library.activeBookId}
              onSelect={selectLibraryBook}
              onRemove={removeLibraryBook}
              onDemo={DEMO_ENABLED ? goDemo : undefined}
            />
          )}

          <FileUpload onBook={handleBookIngested} />
          {uploadError && <p className="upload-error">{uploadError}</p>}
          {library.saveError && (
            <p className="upload-error" role="alert">
              {library.saveError}{' '}
              <button
                type="button"
                className="linkish"
                onClick={library.dismissSaveError}
              >
                Ocultar
              </button>
            </p>
          )}
          {glossaryVault.error && (
            <p className="upload-error" role="alert">
              {glossaryVault.error}
            </p>
          )}

          {book && !showDemo && (
            <BookNav
              book={book}
              chapterIndex={chapterIndex}
              onSelectChapter={selectChapter}
              onClear={() => removeLibraryBook(book.id)}
            />
          )}

          {showDemo && (
            <p className="hint">
              Modo demo (solo desarrollo): texto de ejemplo. Subí un libro para
              guardarlo en un slot.
            </p>
          )}

          {emptyProduction && (
            <p className="hint empty-hint">
              Subí un PDF, EPUB o TXT para empezar. Si ya habías avanzado en el
              libro, usá «Ir a página» después de cargarlo.
            </p>
          )}

          {(showDemo || book) && (
            <label className="block">
              Texto {showDemo ? '(demo, editable)' : 'de la página / capítulo'}
              <textarea
                value={text}
                onChange={
                  showDemo ? (e) => setDemoText(e.target.value) : undefined
                }
                readOnly={!showDemo}
                rows={12}
                spellCheck={false}
              />
            </label>
          )}

          <p className="hint">
            El progreso de lectura se guarda en hasta {MAX_LIBRARY_SLOTS} libros
            abiertos. El archivo de glosario guarda palabras de todos los libros
            que hayas leído.
          </p>
        </section>

        <section className="panel result-panel">
          <div className="panel-head">
            <h2>
              {tab === 'voices'
                ? 'Estudio de voces'
                : tab === 'glossary' && emptyProduction
                  ? 'Archivo de glosario'
                  : emptyProduction
                    ? 'Esperando un libro'
                    : title || `Capítulo ${chapter}`}
            </h2>
            <div className="tabs" role="tablist">
              {(
                [
                  ['adapted', 'Adaptado'],
                  ['original', 'Original'],
                  ['glossary', `Glosario (${glossaryTabCount})`],
                  ['review', 'Repaso'],
                  ['voices', 'Voces'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={tab === id}
                  className={tab === id ? 'tab active' : 'tab'}
                  onClick={() => setTab(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tab === 'voices' ? (
            <VoiceStudio />
          ) : tab === 'glossary' ? (
            <GlossaryPanel
              chapterItems={result.glossary}
              bookItems={bookGlossary}
              bookTitle={book?.title}
              archive={glossaryVault.vault.books}
              onDownload={glossaryVault.downloadJson}
              onImportFile={glossaryVault.importJson}
              onRemoveArchiveBook={(id) => void glossaryVault.removeBook(id)}
            />
          ) : emptyProduction ? (
            <p className="empty-panel">
              Cuando cargues un libro vas a ver el texto adaptado, el glosario y
              los controles de audio acá. Podés ver el archivo de glosario en la
              pestaña{' '}
              <button
                type="button"
                className="linkish"
                onClick={() => setTab('glossary')}
              >
                Glosario
              </button>
              .
            </p>
          ) : (
            <>
              <StatsBar result={result} />

              {tab !== 'review' && (
                <ChangeLog substitutions={result.substitutions} />
              )}

              {tab !== 'review' && (
                <AudioPlayer
                  adaptedText={result.adaptedText}
                  originalText={result.originalText}
                  chapterKey={`${book?.id ?? 'demo'}:${chapterIndex}`}
                  currentLabel={currentChapterLabel}
                  hasNextChapter={hasNextChapter}
                  nextChapterLabel={nextChapterLabel}
                  onAdvanceChapter={advanceChapter}
                  onOpenVoices={() => setTab('voices')}
                />
              )}

              <div className="result-body">
                {tab === 'review' ? (
                  <GlossaryQuiz items={reviewItems} />
                ) : (
                  <HighlightedText
                    result={result}
                    mode={tab === 'adapted' ? 'adapted' : 'original'}
                  />
                )}
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="foot">
        <p>
          Conservador por defecto. {MAX_LIBRARY_SLOTS} libros abiertos · glosario
          archivado sin tope · {APP_VERSION_LABEL}
        </p>
        <p className="foot-version" title="Versión de esta build">
          Lectura Fiel {APP_VERSION_LABEL}
          {library.saving ? ' · guardando…' : ''}
        </p>
      </footer>
    </div>
  )
}
