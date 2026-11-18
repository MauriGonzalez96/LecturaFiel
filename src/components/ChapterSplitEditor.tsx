import { useMemo, useState } from 'react'
import {
  mergeWithNext,
  renameChapter,
  restoreSourceChapters,
  splitChapterAt,
  wordCount,
} from '../ingest/editChapters'
import type { BookChapter } from '../ingest/types'

interface Props {
  chapters: BookChapter[]
  sourceChapters?: BookChapter[]
  activeIndex: number
  onSelect: (index: number) => void
  onApply: (chapters: BookChapter[], focusIndex: number) => void
  onClose: () => void
}

export function ChapterSplitEditor({
  chapters,
  sourceChapters,
  activeIndex,
  onSelect,
  onApply,
  onClose,
}: Props) {
  const [draft, setDraft] = useState(chapters)
  const [focus, setFocus] = useState(activeIndex)
  const [renameValue, setRenameValue] = useState(
    chapters[activeIndex]?.title ?? '',
  )
  const [splitAt, setSplitAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const current = draft[focus]
  const canRestore = Boolean(sourceChapters && sourceChapters.length > 0)

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(chapters),
    [draft, chapters],
  )

  function selectRow(index: number) {
    setFocus(index)
    setRenameValue(draft[index]?.title ?? '')
    setSplitAt(null)
    setError(null)
    onSelect(index)
  }

  function applyRename() {
    const next = renameChapter(draft, focus, renameValue)
    if (next === draft) {
      setError('El título no puede quedar vacío.')
      return
    }
    setDraft(next)
    setError(null)
  }

  function applyMerge() {
    if (focus >= draft.length - 1) {
      setError('No hay un capítulo siguiente para unir.')
      return
    }
    const next = mergeWithNext(draft, focus)
    setDraft(next)
    setRenameValue(next[focus]?.title ?? '')
    setSplitAt(null)
    setError(null)
  }

  function applySplit() {
    if (splitAt == null || !current) {
      setError('Poné el cursor en el texto y usá «Partir aquí».')
      return
    }
    const next = splitChapterAt(draft, focus, splitAt)
    if (next.length === draft.length) {
      setError(
        'No se pudo partir: elegí un punto más al centro del capítulo (no muy al inicio ni al final).',
      )
      return
    }
    setDraft(next)
    setSplitAt(null)
    setError(null)
    setRenameValue(next[focus]?.title ?? '')
  }

  function applyRestore() {
    const next = restoreSourceChapters(draft, sourceChapters)
    setDraft(next)
    const i = Math.min(focus, next.length - 1)
    setFocus(i)
    setRenameValue(next[i]?.title ?? '')
    setSplitAt(null)
    setError(null)
  }

  function save() {
    onApply(draft, focus)
    onClose()
  }

  return (
    <div className="chapter-split-editor">
      <div className="chapter-split-editor-head">
        <div>
          <h3>Editar cortes de capítulos</h3>
          <p className="muted">
            Uní, partí o renombrá secciones. Los resúmenes se invalidan solos si
            cambia el texto de un capítulo.
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={onClose}>
          Cerrar
        </button>
      </div>

      <div className="chapter-split-layout">
        <ol className="chapter-split-list">
          {draft.map((ch, i) => (
            <li key={`${ch.number}-${i}`}>
              <button
                type="button"
                className={`chapter-split-row${i === focus ? ' active' : ''}`}
                onClick={() => selectRow(i)}
              >
                <span className="chapter-summary-item-idx">{i + 1}</span>
                <span className="chapter-split-row-body">
                  <span className="chapter-summary-item-title">{ch.title}</span>
                  <span className="chapter-summary-item-meta">
                    {wordCount(ch.text).toLocaleString('es')} palabras
                    {ch.pageFrom != null
                      ? ` · pág. ${ch.pageFrom}${ch.pageTo != null && ch.pageTo !== ch.pageFrom ? `–${ch.pageTo}` : ''}`
                      : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="chapter-split-detail">
          {current ? (
            <>
              <label className="block">
                Título
                <span className="chapter-split-rename-row">
                  <input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        applyRename()
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={applyRename}
                  >
                    Renombrar
                  </button>
                </span>
              </label>

              <div className="chapter-split-actions">
                <button
                  type="button"
                  className="btn ghost"
                  disabled={focus >= draft.length - 1}
                  onClick={applyMerge}
                >
                  Unir con el siguiente
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={applySplit}
                >
                  Partir aquí
                </button>
                {canRestore && (
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={applyRestore}
                  >
                    Restablecer original
                  </button>
                )}
              </div>

              <label className="block">
                Texto del capítulo (cursor = punto de corte)
                <textarea
                  className="chapter-split-text"
                  value={current.text}
                  readOnly
                  rows={12}
                  spellCheck={false}
                  onSelect={(e) => {
                    const t = e.currentTarget
                    setSplitAt(t.selectionStart)
                  }}
                  onClick={(e) => {
                    const t = e.currentTarget
                    setSplitAt(t.selectionStart)
                  }}
                  onKeyUp={(e) => {
                    const t = e.currentTarget
                    setSplitAt(t.selectionStart)
                  }}
                />
              </label>
              <p className="hint">
                {splitAt != null
                  ? `Corte previsto cerca del carácter ${splitAt.toLocaleString('es')}.`
                  : 'Hacé clic en el texto para elegir dónde partir.'}
              </p>
            </>
          ) : (
            <p className="muted">Elegí un capítulo de la lista.</p>
          )}

          {error && <p className="upload-error">{error}</p>}

          <div className="chapter-split-footer">
            <button
              type="button"
              className="btn primary"
              disabled={!dirty}
              onClick={save}
            >
              Guardar partición
            </button>
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
