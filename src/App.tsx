import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SAMPLE_CHAPTER } from './data/sampleChapter'
import { decisionCache } from './engine/decisionCache'
import { usePipelineResult } from './hooks/usePipelineResult'
import { HighlightedText } from './components/HighlightedText'
import { GlossaryPanel } from './components/GlossaryPanel'
import { GlossaryQuiz } from './components/GlossaryQuiz'
import { StatsBar } from './components/StatsBar'
import { InterventionNotice } from './components/InterventionNotice'
import { EverydayVocabPanel } from './components/EverydayVocabPanel'
import {
  INTERVENTION_OPTIONS,
  type InterventionMode,
} from './settings/intervention'
import {
  AudioPlayer,
  type NowPlayingInfo,
} from './components/AudioPlayer'
import { SummaryReadView } from './components/SummaryReadView'
import { ChangeLog } from './components/ChangeLog'
import { FileUpload } from './components/FileUpload'
import { BookNav } from './components/BookNav'
import { LibraryShelf } from './components/LibraryShelf'
import { SettingsMenu } from './components/SettingsMenu'
import { VoicesSettingsDialog } from './components/VoicesSettingsDialog'
import { AiSettingsPanel } from './components/AiSettingsPanel'
import {
  buildSummaryChapterOptions,
  ChapterSummaryPanel,
} from './components/ChapterSummaryPanel'
import { ChapterSplitEditor } from './components/ChapterSplitEditor'
import { AiSplitProposal } from './components/AiSplitProposal'
import { canOfferAiSplit, needsAiSplit } from './ingest/needsAiSplit'
import { useLibrary } from './library/useLibrary'
import { useGlossaryVault } from './glossary/useGlossaryVault'
import { useInterventionMode } from './hooks/useInterventionMode'
import { useUserEveryday } from './hooks/useUserEveryday'
import { useVoiceSettings } from './hooks/useVoiceSettings'
import { useChapterSummary } from './hooks/useChapterSummary'
import { conceptsFromPipeline } from './ai/summaryConcepts'
import { useBookSummaryIndex } from './hooks/useBookSummaryIndex'
import { useBookSummaryMap } from './hooks/useBookSummaryMap'
import { useBookSummaryQueue } from './hooks/useBookSummaryQueue'
import { downloadBookSummariesMarkdown } from './ai/exportBookSummaries'
import { markSummaryHeard, heardSummaryIndexes } from './ai/summaryHeard'
import { assessSplitConfidence } from './ingest/splitConfidence'
import { useProgressSummary } from './hooks/useProgressSummary'
import { MAX_LIBRARY_SLOTS } from './library/types'
import { DEMO_ENABLED } from './env'
import type { IngestedBook } from './ingest/types'
import { APP_VERSION_LABEL } from './version'

type Tab = 'read' | 'glossary' | 'review' | 'everyday' | 'ai'

export default function App() {
  const library = useLibrary()
  const glossaryVault = useGlossaryVault()
  const intervention = useInterventionMode()
  const userEveryday = useUserEveryday()
  useVoiceSettings()
  const [demoMode, setDemoMode] = useState(DEMO_ENABLED)
  const [showAiSettings, setShowAiSettings] = useState(false)
  const [showSplitEditor, setShowSplitEditor] = useState(false)
  const [showAiSplit, setShowAiSplit] = useState(false)
  const [demoText, setDemoText] = useState(SAMPLE_CHAPTER.text)
  const [tab, setTab] = useState<Tab>('read')
  const tabRef = useRef<Tab>('read')
  tabRef.current = tab
  const [voicesOpen, setVoicesOpen] = useState(false)
  const [cacheTick, setCacheTick] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [seekNonce, setSeekNonce] = useState(0)
  const [summarySentenceIndex, setSummarySentenceIndex] = useState(0)
  const [listenSummaryNonce, setListenSummaryNonce] = useState(0)
  const [aiConfigTick, setAiConfigTick] = useState(0)
  const [summaryIndexTick, setSummaryIndexTick] = useState(0)
  const [heardTick, setHeardTick] = useState(0)
  const [listenOverride, setListenOverride] = useState<string | null>(null)
  const [nowPlaying, setNowPlaying] = useState<NowPlayingInfo | null>(null)
  const [levelNotice, setLevelNotice] = useState(false)
  const [readerFlash, setReaderFlash] = useState(false)
  const prevModeRef = useRef(intervention.mode)

  const showDemo = DEMO_ENABLED && demoMode
  const active = !showDemo ? library.activeSlot : null
  const book = active?.book ?? null
  const chapterIndex = active?.chapterIndex ?? 0
  const sentenceIndex = active?.sentenceIndex ?? 0
  const chapterMeta = book?.chapters[chapterIndex]
  const sentenceSaveTimer = useRef<number | null>(null)

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

  const pipelineBust = `${cacheTick}:${userEveryday.words.join(',')}:${showDemo ? 'd' : 'b'}`
  const { result, pending: pipelinePending } = usePipelineResult(
    text,
    chapter,
    intervention.options,
    pipelineBust,
  )

  const summaryConcepts = useMemo(
    () => conceptsFromPipeline(result),
    [result],
  )

  const chapterSummary = useChapterSummary({
    bookId: showDemo ? 'demo' : (book?.id ?? null),
    chapterIndex: showDemo ? 0 : chapterIndex,
    title:
      (showDemo ? SAMPLE_CHAPTER.title : chapterMeta?.title) ||
      `Capítulo ${chapter}`,
    text,
    concepts: summaryConcepts,
    configTick: aiConfigTick,
    refreshTick: summaryIndexTick,
  })

  const summaryQueue = useBookSummaryQueue()

  const summaryChapterTexts = useMemo(() => {
    if (showDemo) return [demoText]
    return book?.chapters.map((c) => c.text) ?? []
  }, [showDemo, demoText, book])

  const summarizedIndexes = useBookSummaryIndex(
    showDemo ? 'demo' : (book?.id ?? null),
    summaryChapterTexts,
    summaryIndexTick,
  )

  const summaryChapterOptions = useMemo(() => {
    if (showDemo) {
      return buildSummaryChapterOptions([
        {
          number: SAMPLE_CHAPTER.number,
          title: SAMPLE_CHAPTER.title,
          text: demoText,
        },
      ])
    }
    return book ? buildSummaryChapterOptions(book.chapters) : []
  }, [showDemo, demoText, book])

  const summaryMapChapters = useMemo(
    () =>
      summaryChapterOptions.map((c) => ({
        index: c.index,
        title: c.title,
        text: summaryChapterTexts[c.index] ?? '',
      })),
    [summaryChapterOptions, summaryChapterTexts],
  )

  const summaryMapEntries = useBookSummaryMap(
    showDemo ? 'demo' : (book?.id ?? null),
    summaryMapChapters,
    summaryIndexTick,
  )

  const readySummariesForProgress = useMemo(
    () =>
      summaryMapEntries
        .filter((e) => e.ready && e.summary)
        .map((e) => ({
          chapterIndex: e.index,
          title: e.title,
          summary: e.summary!,
        })),
    [summaryMapEntries],
  )

  const progressSummary = useProgressSummary({
    bookId: showDemo ? 'demo' : (book?.id ?? null),
    bookTitle: showDemo
      ? SAMPLE_CHAPTER.title
      : (book?.title ?? 'Libro'),
    upToIndex: showDemo ? 0 : chapterIndex,
    readySummaries: readySummariesForProgress,
    refreshTick: summaryIndexTick,
  })

  const heardIndexes = useMemo(() => {
    const id = showDemo ? 'demo' : book?.id
    if (!id) return new Set<number>()
    void heardTick
    return heardSummaryIndexes(id)
  }, [showDemo, book?.id, heardTick])

  useEffect(() => {
    setListenOverride(null)
  }, [chapterIndex, book?.id, showDemo])

  function keepEveryday(word: string) {
    userEveryday.add(word)
    decisionCache.clear()
    setCacheTick((n) => n + 1)
  }

  // Feedback visible al cambiar nivel (el pipeline ya se recalcula)
  useEffect(() => {
    if (prevModeRef.current === intervention.mode) return
    prevModeRef.current = intervention.mode
    setLevelNotice(true)
    setReaderFlash(true)
    const t = window.setTimeout(() => setReaderFlash(false), 900)
    return () => window.clearTimeout(t)
  }, [intervention.mode])

  function applyInterventionMode(mode: InterventionMode) {
    intervention.setMode(mode)
    setCacheTick((n) => n + 1)
    setLevelNotice(true)
    setReaderFlash(true)
    window.setTimeout(() => setReaderFlash(false), 900)
  }

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
      setTab('read')
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
    // Tras subir: ir a Resumen IA con la lista de capítulos detectados.
    setTab(next.chapters.length > 0 ? 'ai' : 'read')
  }

  function selectChapter(index: number) {
    if (!book) return
    library.setChapterIndex(book.id, index)
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
    return true
  }

  const setSentenceIndex = library.setSentenceIndex
  const saveSentenceProgress = useCallback(
    (index: number) => {
      if (!book || showDemo) return
      if (sentenceSaveTimer.current != null) {
        window.clearTimeout(sentenceSaveTimer.current)
      }
      sentenceSaveTimer.current = window.setTimeout(() => {
        setSentenceIndex(book.id, index)
      }, 400)
    },
    [book, showDemo, setSentenceIndex],
  )

  const placeCursor = useCallback(
    (index: number) => {
      if (showDemo) return
      if (!book) return
      if (sentenceSaveTimer.current != null) {
        window.clearTimeout(sentenceSaveTimer.current)
        sentenceSaveTimer.current = null
      }
      setSentenceIndex(book.id, index)
      setSeekNonce((n) => n + 1)
    },
    [book, showDemo, setSentenceIndex],
  )

  const placeSummaryCursor = useCallback((index: number) => {
    setSummarySentenceIndex(Math.max(0, index))
    setSeekNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    setSummarySentenceIndex(0)
  }, [book?.id, chapterIndex, listenOverride])

  function goDemo() {
    if (!DEMO_ENABLED) return
    library.setActiveBook(null)
    setDemoMode(true)
    setDemoText(SAMPLE_CHAPTER.text)
    setTab('read')
  }

  function selectLibraryBook(bookId: string) {
    library.setActiveBook(bookId)
    setDemoMode(false)
    setTab('read')
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
  const modeMeta =
    INTERVENTION_OPTIONS.find((o) => o.id === intervention.mode) ??
    INTERVENTION_OPTIONS[2]
  const modeBadge = `Adaptado N${intervention.mode}`
  const contextTitle = emptyProduction
    ? 'Sin libro abierto'
    : showDemo
      ? `${SAMPLE_CHAPTER.title} (demo)`
      : book
        ? `${book.title} · ${title || `Capítulo ${chapter}`}`
        : title || `Capítulo ${chapter}`

  const primaryTabs = (
    [
      ['read', 'Lectura'],
      [
        'glossary',
        glossaryTabCount > 0 ? `Glosario (${glossaryTabCount})` : 'Glosario',
      ],
      [
        'ai',
        !showDemo &&
        book &&
        summaryChapterOptions.length > 1 &&
        summarizedIndexes.size > 0
          ? `Resumen IA (${summarizedIndexes.size}/${summaryChapterOptions.length})`
          : chapterSummary.summaryText
            ? 'Resumen IA ✓'
            : 'Resumen IA',
      ],
      ['review', 'Repaso'],
    ] as const
  )

  const workspaceTitle =
    tab === 'ai'
      ? 'Resumen IA del capítulo'
      : tab === 'everyday'
        ? 'Vocabulario cotidiano'
        : tab === 'glossary' && emptyProduction
          ? 'Archivo de glosario'
          : emptyProduction
            ? 'Esperando un libro'
            : title || `Capítulo ${chapter}`

  const showPlayerDock = !emptyProduction && tab !== 'review'

  return (
    <div
      className={`app app-shell${showPlayerDock ? ' has-player-dock' : ''}`}
    >
      <div className="atmosphere" aria-hidden="true" />

      <header className="app-chrome">
        <div className="chrome-brand">
          <p className="brand">Lektor</p>
        </div>

        <div className="chrome-context">
          <p className="chrome-title">{contextTitle}</p>
          {!emptyProduction && (
            <span className="chrome-badge" title={modeMeta.hint}>
              {modeBadge}
            </span>
          )}
        </div>

        <nav className="chrome-nav" aria-label="Secciones">
          {primaryTabs.map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={
                tab === id ? 'chrome-nav-btn active' : 'chrome-nav-btn'
              }
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="chrome-actions">
          <SettingsMenu
            onOpenVoices={() => setVoicesOpen(true)}
            onClearCache={clearCache}
            onDemo={DEMO_ENABLED ? goDemo : undefined}
            demoEnabled={DEMO_ENABLED}
            interventionMode={intervention.mode}
            onInterventionMode={applyInterventionMode}
            onInterventionApplied={() => {
              setLevelNotice(true)
              setTab('read')
            }}
            onOpenEveryday={() => setTab('everyday')}
            everydayCount={userEveryday.count}
            onOpenAi={() => {
              setShowAiSettings(true)
              setTab('ai')
            }}
          />
        </div>
      </header>

      <main className="layout shell-layout">
        <aside className="panel sidebar-panel">
          <div className="sidebar-section">
            <p className="sidebar-kicker">Fuente &amp; biblioteca</p>
            <p className="sidebar-meta">
              {library.slots.length}/{MAX_LIBRARY_SLOTS} volúmenes
            </p>
          </div>

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

          {!library.ready ? (
            <p className="hint">Cargando biblioteca…</p>
          ) : (
            <LibraryShelf
              compact
              slots={library.slots}
              activeBookId={showDemo ? null : library.activeBookId}
              onSelect={selectLibraryBook}
              onRemove={removeLibraryBook}
              onDemo={DEMO_ENABLED ? goDemo : undefined}
            />
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
              Modo demo: texto de ejemplo. Subí un libro para ocuparlo en la
              biblioteca.
            </p>
          )}

          {emptyProduction && (
            <p className="hint empty-hint">
              Subí un PDF, EPUB o TXT para empezar.
            </p>
          )}

          {(showDemo || book) && (
            <details className="source-fold" open={showDemo || emptyProduction}>
              <summary>
                Texto {showDemo ? '(demo, editable)' : 'del capítulo'}
              </summary>
              <label className="block source-fold-body">
                <span className="sr-only">
                  Texto {showDemo ? 'demo editable' : 'del capítulo'}
                </span>
                <textarea
                  value={text}
                  onChange={
                    showDemo ? (e) => setDemoText(e.target.value) : undefined
                  }
                  readOnly={!showDemo}
                  rows={showDemo ? 10 : 6}
                  spellCheck={false}
                />
              </label>
            </details>
          )}

          <div className="sidebar-foot">
            <p className="sidebar-level" title={modeMeta.hint}>
              Nivel léxico · {modeMeta.label.replace(/^\d+\s*—\s*/, '')}
            </p>
            <button
              type="button"
              className="linkish"
              onClick={() => setTab('everyday')}
            >
              Cotidianas
              {userEveryday.count > 0 ? ` (${userEveryday.count})` : ''}
            </button>
          </div>
        </aside>

        <section className="panel result-panel workspace-panel">
          <div className="panel-head workspace-head">
            <h2>{workspaceTitle}</h2>
            {tab === 'everyday' && (
              <button
                type="button"
                className="btn ghost"
                onClick={() => setTab('glossary')}
              >
                Volver al glosario
              </button>
            )}
          </div>

          {tab === 'ai' && emptyProduction ? (
            <AiSettingsPanel
              onClose={() => setTab('read')}
              onSaved={() => setAiConfigTick((n) => n + 1)}
            />
          ) : tab === 'everyday' ? (
            <EverydayVocabPanel
              words={userEveryday.words}
              onAdd={userEveryday.add}
              onRemove={userEveryday.remove}
              onClear={userEveryday.clear}
              onChanged={() => {
                decisionCache.clear()
                setCacheTick((n) => n + 1)
              }}
            />
          ) : emptyProduction && tab !== 'glossary' ? (
            <p className="empty-panel">
              Cuando cargues un libro vas a ver el texto adaptado, el glosario y
              los controles de audio acá. Podés ver el archivo en{' '}
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
              {tab !== 'review' && !emptyProduction && (
                <>
                  {tab === 'read' && (
                    <>
                      <StatsBar result={result} mode={intervention.mode} />
                      {levelNotice && (
                        <InterventionNotice
                          mode={intervention.mode}
                          substituted={result.stats.substituted}
                          rarity={result.stats.rarityDetected}
                          glossaryOnly={result.stats.glossaryOnly}
                          onDismiss={() => setLevelNotice(false)}
                        />
                      )}
                      <ChangeLog
                        substitutions={result.substitutions}
                        onKeepEveryday={keepEveryday}
                      />
                    </>
                  )}
                  {tab === 'ai' && (
                    <>
                      {(showAiSettings ||
                        chapterSummary.status === 'unconfigured') && (
                        <AiSettingsPanel
                          onClose={() => setShowAiSettings(false)}
                          onSaved={() => {
                            setAiConfigTick((n) => n + 1)
                            setShowAiSettings(false)
                          }}
                        />
                      )}
                      {showAiSplit && book && !showDemo ? (
                        <AiSplitProposal
                          bookTitle={book.title}
                          currentChapters={book.chapters}
                          onNeedSettings={() => setShowAiSettings(true)}
                          onCancel={() => setShowAiSplit(false)}
                          onAccept={(nextChapters) => {
                            library.updateBookChapters(book.id, nextChapters, {
                              splitConfidence: 'high',
                              chapterIndex: 0,
                            })
                            setSummaryIndexTick((n) => n + 1)
                            setCacheTick((n) => n + 1)
                            setShowAiSplit(false)
                            setShowSplitEditor(false)
                          }}
                        />
                      ) : showSplitEditor && book && !showDemo ? (
                        <ChapterSplitEditor
                          chapters={book.chapters}
                          sourceChapters={book.sourceChapters}
                          activeIndex={chapterIndex}
                          onSelect={selectChapter}
                          onClose={() => setShowSplitEditor(false)}
                          onApply={(nextChapters, focusIndex) => {
                            library.updateBookChapters(book.id, nextChapters, {
                              splitConfidence: 'high',
                              chapterIndex: focusIndex,
                            })
                            setSummaryIndexTick((n) => n + 1)
                            setCacheTick((n) => n + 1)
                            setShowSplitEditor(false)
                          }}
                        />
                      ) : (
                        <ChapterSummaryPanel
                          status={chapterSummary.status}
                          summary={chapterSummary.summary}
                          error={chapterSummary.error}
                          canRun={chapterSummary.canRun}
                          onGenerate={(force) => {
                            void chapterSummary.generate(force).then(() => {
                              setSummaryIndexTick((n) => n + 1)
                            })
                          }}
                          onCancel={chapterSummary.cancel}
                          onOpenSettings={() => setShowAiSettings(true)}
                          onListen={() => {
                            setListenOverride(null)
                            setTab('ai')
                            setListenSummaryNonce((n) => n + 1)
                          }}
                          chapters={summaryChapterOptions}
                          activeChapterIndex={showDemo ? 0 : chapterIndex}
                          summarizedIndexes={summarizedIndexes}
                          heardIndexes={heardIndexes}
                          bookTitle={
                            showDemo ? 'Demo' : (book?.title ?? null)
                          }
                          progressStatus={progressSummary.status}
                          progress={progressSummary.progress}
                          progressError={progressSummary.error}
                          progressCanRun={progressSummary.canRun}
                          progressAvailableCount={
                            progressSummary.availableCount
                          }
                          onGenerateProgress={(force) => {
                            void progressSummary.generate(force)
                          }}
                          onCancelProgress={progressSummary.cancel}
                          onListenProgress={() => {
                            if (!progressSummary.progressText.trim()) return
                            setListenOverride(progressSummary.progressText)
                            setTab('ai')
                            setListenSummaryNonce((n) => n + 1)
                          }}
                          onSelectChapter={(index) => {
                            if (showDemo) return
                            selectChapter(index)
                          }}
                          mapEntries={summaryMapEntries}
                          splitConfidence={
                            showDemo
                              ? 'high'
                              : book
                                ? (book.splitConfidence ??
                                  assessSplitConfidence({
                                    format: book.format,
                                    chapters: book.chapters,
                                    usedPageChunks:
                                      book.format === 'pdf' &&
                                      book.chapters.length > 1 &&
                                      book.chapters.every(
                                        (c) =>
                                          !(
                                            c.literaryChapter &&
                                            c.literaryChapter > 0
                                          ),
                                      ),
                                  }))
                                : null
                          }
                          bookFormat={
                            showDemo ? 'txt' : (book?.format ?? null)
                          }
                          canEditSplits={Boolean(book && !showDemo)}
                          onEditSplits={() => {
                            setShowAiSplit(false)
                            setShowSplitEditor(true)
                          }}
                          suggestAiSplit={
                            Boolean(book && !showDemo && needsAiSplit(book))
                          }
                          onAiSplit={
                            book && !showDemo && canOfferAiSplit(book)
                              ? () => {
                                  setShowSplitEditor(false)
                                  setShowAiSplit(true)
                                }
                              : undefined
                          }
                          onDownloadMarkdown={() => {
                            downloadBookSummariesMarkdown({
                              bookTitle: showDemo
                                ? SAMPLE_CHAPTER.title
                                : (book?.title ?? 'Libro'),
                              entries: summaryMapEntries,
                            })
                          }}
                          queueProgress={summaryQueue.progress}
                          queueRunning={summaryQueue.running}
                          onCancelQueue={summaryQueue.cancel}
                          onStartQueue={({ skipExisting }) => {
                            const bookId = showDemo
                              ? 'demo'
                              : (book?.id ?? null)
                            if (!bookId) return
                            const chapters = summaryChapterOptions.map((c) => ({
                              index: c.index,
                              title: c.title,
                              text: summaryChapterTexts[c.index] ?? '',
                            }))
                            void summaryQueue
                              .start({
                                bookId,
                                chapters,
                                skipExisting,
                                onProgress: (p) => {
                                  if (p.done > 0) {
                                    setSummaryIndexTick((n) => n + 1)
                                  }
                                  if (
                                    !showDemo &&
                                    p.currentIndex != null &&
                                    p.status === 'running'
                                  ) {
                                    selectChapter(p.currentIndex)
                                  }
                                },
                              })
                              .then(() => {
                                setSummaryIndexTick((n) => n + 1)
                              })
                          }}
                        />
                      )}
                    </>
                  )}
                </>
              )}

              <div
                className={`result-body${readerFlash ? ' reader-flash' : ''}`}
              >
                {tab === 'glossary' ? (
                  <GlossaryPanel
                    bookItems={bookGlossary}
                    bookTitle={book?.title}
                    archive={glossaryVault.vault.books}
                    initialScope={book ? 'book' : 'general'}
                    onDownload={glossaryVault.downloadJson}
                    onImportFile={glossaryVault.importJson}
                    onRemoveArchiveBook={(id) =>
                      void glossaryVault.removeBook(id)
                    }
                    onKeepEveryday={keepEveryday}
                  />
                ) : tab === 'review' ? (
                  <GlossaryQuiz items={reviewItems} />
                ) : tab === 'ai' ? (
                  <SummaryReadView
                    text={listenOverride ?? chapterSummary.summaryText}
                    chapterLabel={
                      listenOverride
                        ? progressSummary.progress?.title ||
                          'Resumen hasta este capítulo'
                        : currentChapterLabel
                    }
                    activeSentenceIndex={
                      nowPlaying?.source === 'summary'
                        ? nowPlaying.sentenceIndex
                        : summarySentenceIndex
                    }
                    onPlaceCursor={showDemo ? undefined : placeSummaryCursor}
                    emptyHint={
                      chapterSummary.status === 'loading'
                        ? 'Generando resumen… el texto aparecerá acá y podrás escucharlo con «Resumen IA».'
                        : 'Generá el resumen arriba para verlo y escucharlo con el botón «Resumen IA».'
                    }
                  />
                ) : (
                  <HighlightedText
                    result={result}
                    activeSentenceIndex={
                      nowPlaying && nowPlaying.source !== 'summary'
                        ? nowPlaying.sentenceIndex
                        : showDemo
                          ? 0
                          : sentenceIndex
                    }
                    onPlaceCursor={showDemo ? undefined : placeCursor}
                  />
                )}
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="foot">
        <p>
          {MAX_LIBRARY_SLOTS} libros · glosario archivado · {APP_VERSION_LABEL}
        </p>
        <p className="foot-version" title="Versión de esta build">
          Lektor {APP_VERSION_LABEL}
          {library.saving ? ' · guardando…' : ''}
          {pipelinePending ? ' · adaptando…' : ''}
        </p>
      </footer>

      {showPlayerDock && (
        <div className="player-dock" role="region" aria-label="Reproductor">
          <AudioPlayer
            variant="dock"
            adaptedText={result.adaptedText}
            originalText={result.originalText}
            summaryText={listenOverride ?? chapterSummary.summaryText}
            chapterKey={`${book?.id ?? 'demo'}:${chapterIndex}`}
            currentLabel={currentChapterLabel}
            hasNextChapter={hasNextChapter}
            nextChapterLabel={nextChapterLabel}
            onAdvanceChapter={advanceChapter}
            onOpenVoices={() => setVoicesOpen(true)}
            resumeSentenceIndex={showDemo ? 0 : sentenceIndex}
            resumeSummaryIndex={summarySentenceIndex}
            onSentenceProgress={showDemo ? undefined : saveSentenceProgress}
            onSummarySentenceProgress={setSummarySentenceIndex}
            seekNonce={seekNonce}
            listenSummaryNonce={listenSummaryNonce}
            summaryStatus={listenOverride ? 'ready' : chapterSummary.status}
            onSummaryHeard={() => {
              if (listenOverride) return
              const id = showDemo ? 'demo' : book?.id
              if (!id) return
              markSummaryHeard(id, showDemo ? 0 : chapterIndex)
              setHeardTick((n) => n + 1)
            }}
            onGenerateSummaryForChain={() => {
              if (listenOverride) return
              if (!chapterSummary.canRun) return
              if (chapterSummary.status === 'loading') return
              void chapterSummary.generate(false).then(() => {
                setSummaryIndexTick((n) => n + 1)
              })
            }}
            onNowPlaying={(info) => {
              setNowPlaying(info)
              if (info?.source === 'summary') {
                setTab('ai')
              }
            }}
          />
        </div>
      )}

      <VoicesSettingsDialog
        open={voicesOpen}
        onClose={() => setVoicesOpen(false)}
      />
    </div>
  )
}
