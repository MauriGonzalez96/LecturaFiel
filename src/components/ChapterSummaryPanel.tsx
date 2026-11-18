import { useState } from 'react'
import type { BookSummaryMapEntry } from '../ai/exportBookSummaries'
import type { BookSummaryQueueProgress } from '../ai/summarizeBookQueue'
import type {
  ChapterSummary,
  ProgressSummary,
  SummaryStatus,
} from '../ai/types'
import {
  splitConfidenceHint,
  splitConfidenceLabel,
} from '../ingest/splitConfidence'
import type {
  BookChapter,
  BookFormat,
  SplitConfidence,
} from '../ingest/types'

export interface SummaryChapterOption {
  index: number
  title: string
  label: string
  wordCount: number
}

interface Props {
  status: SummaryStatus
  summary: ChapterSummary | null
  error: string | null
  canRun: boolean
  onGenerate: (force?: boolean) => void
  onCancel: () => void
  onOpenSettings: () => void
  onListen?: () => void
  listening?: boolean
  /** Capítulos del libro detectados en la ingestión. */
  chapters?: SummaryChapterOption[]
  activeChapterIndex?: number
  summarizedIndexes?: ReadonlySet<number>
  onSelectChapter?: (index: number) => void
  bookTitle?: string | null
  /** Cola: resumir todos los capítulos del libro. */
  queueProgress?: BookSummaryQueueProgress
  queueRunning?: boolean
  onStartQueue?: (opts: { skipExisting: boolean }) => void
  onCancelQueue?: () => void
  /** Mapa con excerpts de resúmenes (Fase 2). */
  mapEntries?: BookSummaryMapEntry[]
  onDownloadMarkdown?: () => void
  /** Calidad de la partición al subir el libro (Fase 0/7). */
  splitConfidence?: SplitConfidence | null
  bookFormat?: BookFormat | null
  /** Abrir editor manual de cortes (Fase 4). */
  onEditSplits?: () => void
  canEditSplits?: boolean
  /** Mejorar partición con IA (Fase 5). */
  onAiSplit?: () => void
  suggestAiSplit?: boolean
  heardIndexes?: ReadonlySet<number>
  /** Resumen acumulado hasta el capítulo actual (Fase 3). */
  progressStatus?: SummaryStatus
  progress?: ProgressSummary | null
  progressError?: string | null
  progressCanRun?: boolean
  progressAvailableCount?: number
  onGenerateProgress?: (force?: boolean) => void
  onCancelProgress?: () => void
  onListenProgress?: () => void
}

export function ChapterSummaryPanel({
  status,
  summary,
  error,
  canRun,
  onGenerate,
  onCancel,
  onOpenSettings,
  onListen,
  listening = false,
  chapters,
  activeChapterIndex = 0,
  summarizedIndexes,
  onSelectChapter,
  bookTitle,
  queueProgress,
  queueRunning = false,
  onStartQueue,
  onCancelQueue,
  mapEntries,
  onDownloadMarkdown,
  splitConfidence = null,
  bookFormat = null,
  onEditSplits,
  canEditSplits = false,
  onAiSplit,
  suggestAiSplit = false,
  heardIndexes,
  progressStatus = 'idle',
  progress = null,
  progressError = null,
  progressCanRun = false,
  progressAvailableCount = 0,
  onGenerateProgress,
  onCancelProgress,
  onListenProgress,
}: Props) {
  const [skipExisting, setSkipExisting] = useState(true)
  const [tocView, setTocView] = useState<'lista' | 'mapa'>('lista')
  const multi = (chapters?.length ?? 0) > 1
  const active = chapters?.[activeChapterIndex]
  const doneCount = chapters
    ? chapters.filter((c) => summarizedIndexes?.has(c.index)).length
    : 0
  const queuePct =
    queueProgress && queueProgress.total > 0
      ? Math.round((queueProgress.done / queueProgress.total) * 100)
      : 0
  const mapByIndex = new Map((mapEntries ?? []).map((e) => [e.index, e]))
  const weakHint =
    splitConfidence && bookFormat
      ? splitConfidenceHint(splitConfidence, bookFormat)
      : null

  return (
    <div className="chapter-summary">
      {chapters && chapters.length > 0 && onSelectChapter && (
        <div className="chapter-summary-toc">
          <div className="chapter-summary-toc-head">
            <div>
              <h3 className="chapter-summary-title">
                {tocView === 'mapa' ? 'Mapa del libro' : 'Capítulos detectados'}
                {bookTitle ? ` · ${bookTitle}` : ''}
              </h3>
              <p className="chapter-summary-hint">
                {tocView === 'mapa'
                  ? 'Índice con la explicación detallada de cada capítulo ya generado. Tocá uno para abrirlo.'
                  : multi
                    ? `${chapters.length} secciones al subir el libro. Elegí una y generá el resumen, o resumí todos en cola.`
                    : 'Se detectó una sola sección. Si el archivo no trae encabezados de capítulo, el resumen cubre todo el texto cargado.'}
              </p>
            </div>
            <div className="chapter-summary-toc-tools">
              {multi && (
                <p className="chapter-summary-progress" aria-live="polite">
                  {doneCount}/{chapters.length} con resumen
                </p>
              )}
              <div className="chapter-summary-view-toggle" role="group" aria-label="Vista">
                <button
                  type="button"
                  className={tocView === 'lista' ? 'active' : ''}
                  onClick={() => setTocView('lista')}
                >
                  Lista
                </button>
                <button
                  type="button"
                  className={tocView === 'mapa' ? 'active' : ''}
                  onClick={() => setTocView('mapa')}
                >
                  Mapa
                </button>
              </div>
              {onDownloadMarkdown && (
                <button
                  type="button"
                  className="btn ghost"
                  disabled={doneCount === 0}
                  onClick={onDownloadMarkdown}
                  title={
                    doneCount === 0
                      ? 'Generá al menos un resumen para exportar'
                      : 'Descargar resúmenes en Markdown'
                  }
                >
                  Descargar .md
                </button>
              )}
            </div>
          </div>

          {weakHint && (
            <div className="chapter-summary-split-banner" role="status">
              <strong>
                {splitConfidence
                  ? splitConfidenceLabel(splitConfidence)
                  : 'Partición débil'}
              </strong>
              <p>{weakHint}</p>
              <p className="chapter-summary-split-banner-next">
                Podés resumir igual, o corregir los cortes a mano
                {canEditSplits ? '' : ' (disponible con un libro subido)'}.
              </p>
              <div className="chapter-summary-split-banner-actions">
                {canEditSplits && onEditSplits && (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={onEditSplits}
                  >
                    Editar cortes…
                  </button>
                )}
                {onAiSplit && (
                  <button
                    type="button"
                    className="btn primary"
                    onClick={onAiSplit}
                  >
                    Mejorar partición con IA…
                  </button>
                )}
              </div>
            </div>
          )}

          {!weakHint && (canEditSplits || onAiSplit) && (
            <div className="chapter-summary-edit-row">
              {canEditSplits && onEditSplits && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={onEditSplits}
                >
                  Editar cortes de capítulos…
                </button>
              )}
              {onAiSplit && (
                <button
                  type="button"
                  className={suggestAiSplit ? 'btn primary' : 'btn ghost'}
                  onClick={onAiSplit}
                >
                  Mejorar partición con IA…
                </button>
              )}
            </div>
          )}

          {multi && onStartQueue && (
            <div className="chapter-summary-queue">
              <label className="chapter-summary-queue-skip">
                <input
                  type="checkbox"
                  checked={skipExisting}
                  disabled={queueRunning}
                  onChange={(e) => setSkipExisting(e.target.checked)}
                />
                Saltar los que ya tienen resumen
              </label>
              <div className="chapter-summary-queue-actions">
                {queueRunning ? (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={onCancelQueue}
                  >
                    Cancelar cola
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn primary"
                    disabled={
                      status === 'unconfigured' ||
                      !chapters.some((c) => c.wordCount > 0)
                    }
                    onClick={() => onStartQueue({ skipExisting })}
                  >
                    Resumir todos los capítulos
                  </button>
                )}
              </div>
              {queueProgress && queueProgress.status !== 'idle' && (
                <div className="chapter-summary-queue-status" aria-live="polite">
                  <div className="chapter-summary-queue-bar">
                    <span style={{ width: `${queuePct}%` }} />
                  </div>
                  <p className="chapter-summary-queue-label">
                    {queueProgress.status === 'running' && (
                      <>
                        Resumiendo {queueProgress.done}/{queueProgress.total}
                        {queueProgress.currentTitle
                          ? ` · ${queueProgress.currentTitle}`
                          : ''}
                      </>
                    )}
                    {queueProgress.status === 'completed' && (
                      <>
                        Listo: {queueProgress.done}/{queueProgress.total}
                        {queueProgress.skipped > 0
                          ? ` (${queueProgress.skipped} en caché)`
                          : ''}
                        {queueProgress.failed.length > 0
                          ? ` · ${queueProgress.failed.length} con error`
                          : ''}
                      </>
                    )}
                    {queueProgress.status === 'cancelled' && (
                      <>
                        Cola cancelada · {queueProgress.done}/
                        {queueProgress.total} hechos
                      </>
                    )}
                    {queueProgress.status === 'error' && (
                      <>No se pudo resumir ningún capítulo.</>
                    )}
                  </p>
                  {queueProgress.failed.length > 0 && (
                    <ul className="chapter-summary-queue-errors">
                      {queueProgress.failed.slice(0, 5).map((f) => (
                        <li key={f.index}>
                          Cap. {f.index + 1}: {f.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {tocView === 'mapa' ? (
            <ol className="chapter-summary-map">
              {chapters.map((ch) => {
                const entry = mapByIndex.get(ch.index)
                const activeRow = ch.index === activeChapterIndex
                const ready = entry?.ready ?? false
                const queueCurrent =
                  queueRunning && queueProgress?.currentIndex === ch.index
                return (
                  <li key={ch.index}>
                    <button
                      type="button"
                      className={`chapter-summary-map-card${activeRow ? ' active' : ''}${ready ? ' done' : ''}${queueCurrent ? ' queueing' : ''}`}
                      onClick={() => onSelectChapter(ch.index)}
                      aria-current={activeRow ? 'true' : undefined}
                    >
                      <div className="chapter-summary-map-card-head">
                        <span className="chapter-summary-item-idx">
                          {ch.index + 1}
                        </span>
                        <span className="chapter-summary-item-title">
                          {ch.title}
                        </span>
                        <span className="chapter-summary-map-state">
                          {queueCurrent
                            ? 'Generando…'
                            : heardIndexes?.has(ch.index)
                              ? 'Escuchado'
                              : ready
                                ? 'Listo'
                                : 'Pendiente'}
                        </span>
                      </div>
                      {ready && entry?.excerpt ? (
                        <p className="chapter-summary-map-excerpt">
                          {entry.excerpt}
                        </p>
                      ) : (
                        <p className="chapter-summary-map-excerpt muted">
                          {queueCurrent
                            ? 'La IA está redactando la explicación detallada…'
                            : 'Sin resumen todavía.'}
                        </p>
                      )}
                    </button>
                  </li>
                )
              })}
            </ol>
          ) : (
            <ol className="chapter-summary-list">
              {chapters.map((ch) => {
                const activeRow = ch.index === activeChapterIndex
                const hasSummary = summarizedIndexes?.has(ch.index) ?? false
                const queueCurrent =
                  queueRunning && queueProgress?.currentIndex === ch.index
                return (
                  <li key={ch.index}>
                    <button
                      type="button"
                      className={`chapter-summary-item${activeRow ? ' active' : ''}${hasSummary ? ' done' : ''}${queueCurrent ? ' queueing' : ''}`}
                      onClick={() => onSelectChapter(ch.index)}
                      aria-current={activeRow ? 'true' : undefined}
                    >
                      <span className="chapter-summary-item-idx">
                        {ch.index + 1}
                      </span>
                      <span className="chapter-summary-item-body">
                        <span className="chapter-summary-item-title">
                          {ch.label}
                        </span>
                        <span className="chapter-summary-item-meta">
                          {ch.wordCount.toLocaleString('es')} palabras
                          {queueCurrent
                            ? ' · generando…'
                            : heardIndexes?.has(ch.index)
                              ? ' · escuchado'
                              : hasSummary
                                ? ' · resumen listo'
                                : ''}
                        </span>
                      </span>
                      <span
                        className="chapter-summary-item-mark"
                        aria-hidden="true"
                      >
                        {heardIndexes?.has(ch.index)
                          ? '♪'
                          : hasSummary
                            ? '✓'
                            : queueCurrent
                              ? '…'
                              : ''}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          )}

          {multi && (
            <div className="chapter-summary-pager">
              <button
                type="button"
                className="btn ghost"
                disabled={activeChapterIndex <= 0}
                onClick={() => onSelectChapter(activeChapterIndex - 1)}
              >
                ← Anterior
              </button>
              <span className="muted">
                Capítulo {activeChapterIndex + 1} de {chapters.length}
              </span>
              <button
                type="button"
                className="btn ghost"
                disabled={activeChapterIndex >= chapters.length - 1}
                onClick={() => onSelectChapter(activeChapterIndex + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}

      <div className="chapter-summary-bar">
        <div>
          <h3 className="chapter-summary-title">
            Resumen
            {active
              ? ` · ${active.title || `Capítulo ${active.index + 1}`}`
              : ' del capítulo (IA)'}
          </h3>
          <p className="chapter-summary-hint">
            Como alguien que leyó el capítulo con ganas: te cuenta la esencia,
            introduce los conceptos del autor (también los que Lectura Fiel
            intercambió) y explica en qué contexto los usa.
          </p>
        </div>
        <div className="chapter-summary-actions">
          {status === 'unconfigured' && (
            <button
              type="button"
              className="btn primary"
              onClick={onOpenSettings}
            >
              Configurar IA…
            </button>
          )}
          {status === 'loading' && !queueRunning && (
            <button type="button" className="btn ghost" onClick={onCancel}>
              Cancelar
            </button>
          )}
          {status !== 'unconfigured' && status !== 'loading' && (
            <button
              type="button"
              className="btn primary"
              disabled={!canRun || queueRunning}
              onClick={() => onGenerate(Boolean(summary))}
            >
              {summary ? 'Regenerar' : 'Generar resumen'}
            </button>
          )}
          {status !== 'unconfigured' && (
            <button
              type="button"
              className="btn ghost"
              onClick={onOpenSettings}
            >
              Ajustes IA
            </button>
          )}
          {summary && onListen && (
            <button
              type="button"
              className="btn ghost"
              onClick={onListen}
              disabled={listening}
            >
              Escuchar resumen
            </button>
          )}
        </div>
      </div>

      {status === 'loading' && (
        <p className="chapter-summary-loading">
          Generando resumen… puede tardar en capítulos largos.
        </p>
      )}
      {status === 'unconfigured' && (
        <p className="chapter-summary-loading">
          Configurá Gemini (API key de Google AI Studio) con la guía paso a
          paso, u otro proveedor / Ollama local.
        </p>
      )}
      {error && <p className="chapter-summary-error">{error}</p>}
      {summary && (
        <div className="chapter-summary-body">
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            {summary.model} ·{' '}
            {new Date(summary.createdAt).toLocaleString(undefined, {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </p>
          {summary.summary.split(/\n+/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      )}

      {onGenerateProgress && (
        <div className="chapter-progress">
          <div className="chapter-summary-bar">
            <div>
              <h3 className="chapter-summary-title">
                Resumen hasta este capítulo
              </h3>
              <p className="chapter-summary-hint">
                Arco del libro usando los {progressAvailableCount} resumen
                {progressAvailableCount === 1 ? '' : 'es'} ya listos hasta acá.
              </p>
            </div>
            <div className="chapter-summary-actions">
              {progressStatus === 'loading' && onCancelProgress && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={onCancelProgress}
                >
                  Cancelar
                </button>
              )}
              {progressStatus !== 'loading' && (
                <button
                  type="button"
                  className="btn primary"
                  disabled={!progressCanRun || queueRunning}
                  onClick={() => onGenerateProgress(Boolean(progress))}
                >
                  {progress ? 'Regenerar progreso' : 'Generar progreso'}
                </button>
              )}
              {progress && onListenProgress && (
                <button
                  type="button"
                  className="btn ghost"
                  onClick={onListenProgress}
                >
                  Escuchar progreso
                </button>
              )}
            </div>
          </div>
          {progressStatus === 'loading' && (
            <p className="chapter-summary-loading">
              Sintetizando el arco hasta aquí…
            </p>
          )}
          {!progressCanRun && progressStatus !== 'loading' && (
            <p className="muted">
              Generá al menos un resumen de capítulo (hasta el actual) para
              armar el progreso.
            </p>
          )}
          {progressError && (
            <p className="chapter-summary-error">{progressError}</p>
          )}
          {progress && (
            <div className="chapter-summary-body">
              <p className="muted" style={{ fontSize: '0.85rem' }}>
                {progress.model} · {progress.title} ·{' '}
                {new Date(progress.createdAt).toLocaleString(undefined, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
              {progress.summary.split(/\n+/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function buildSummaryChapterOptions(
  chapters: BookChapter[],
): SummaryChapterOption[] {
  return chapters.map((ch, index) => {
    const words = ch.text.trim()
      ? ch.text.trim().split(/\s+/).filter(Boolean).length
      : 0
    const title = ch.title?.trim() || `Capítulo ${ch.number || index + 1}`
    const label =
      ch.chapterLabel && ch.chapterLabel !== 'Inicio / preliminares'
        ? ch.pageFrom != null
          ? `Pág. ${ch.pageFrom}${ch.pageTo != null && ch.pageTo !== ch.pageFrom ? `–${ch.pageTo}` : ''} · ${shorten(ch.chapterLabel, 48)}`
          : shorten(ch.chapterLabel, 56)
        : ch.pageFrom != null
          ? `Pág. ${ch.pageFrom}${ch.pageTo != null && ch.pageTo !== ch.pageFrom ? `–${ch.pageTo}` : ''} · ${shorten(title, 40)}`
          : shorten(title, 64)
    return { index, title, label, wordCount: words }
  })
}

function shorten(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}
