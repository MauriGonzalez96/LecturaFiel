import { useState } from 'react'
import {
  detectChaptersWithAi,
  summarizePartition,
} from '../ai/detectChapters'
import { wordCount } from '../ingest/editChapters'
import type { BookChapter } from '../ingest/types'

interface Props {
  bookTitle: string
  currentChapters: BookChapter[]
  onAccept: (chapters: BookChapter[]) => void
  onCancel: () => void
  onNeedSettings: () => void
}

type Phase = 'idle' | 'loading' | 'preview' | 'error'

export function AiSplitProposal({
  bookTitle,
  currentChapters,
  onAccept,
  onCancel,
  onNeedSettings,
}: Props) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [proposed, setProposed] = useState<BookChapter[] | null>(null)
  const [model, setModel] = useState<string | null>(null)
  const [abort, setAbort] = useState<AbortController | null>(null)

  const before = summarizePartition(currentChapters)
  const after = proposed ? summarizePartition(proposed) : null

  async function run() {
    abort?.abort()
    const ac = new AbortController()
    setAbort(ac)
    setPhase('loading')
    setError(null)
    setProposed(null)
    try {
      const result = await detectChaptersWithAi({
        bookTitle,
        chapters: currentChapters,
        signal: ac.signal,
      })
      if (ac.signal.aborted) return
      setProposed(result.chapters)
      setModel(result.model)
      setPhase('preview')
    } catch (e) {
      if (ac.signal.aborted) return
      const msg = e instanceof Error ? e.message : String(e)
      if (/configurá la ia|ajustes/i.test(msg)) {
        onNeedSettings()
      }
      setError(msg)
      setPhase('error')
    } finally {
      setAbort(null)
    }
  }

  function cancelRun() {
    abort?.abort()
    setAbort(null)
    setPhase(proposed ? 'preview' : 'idle')
  }

  return (
    <div className="ai-split-proposal">
      <div className="ai-split-proposal-head">
        <div>
          <h3>Mejorar partición con IA</h3>
          <p className="muted">
            La IA sugiere cortes; el texto del libro no se reescribe. Revisá y
            aceptá solo si tiene sentido.
          </p>
        </div>
        <button type="button" className="btn ghost" onClick={onCancel}>
          Cerrar
        </button>
      </div>

      <div className="ai-split-proposal-actions">
        {phase === 'loading' ? (
          <button type="button" className="btn ghost" onClick={cancelRun}>
            Cancelar
          </button>
        ) : (
          <button type="button" className="btn primary" onClick={() => void run()}>
            {proposed ? 'Volver a detectar' : 'Detectar capítulos'}
          </button>
        )}
      </div>

      {phase === 'loading' && (
        <p className="chapter-summary-loading">
          Analizando muestras del libro… un solo pedido a la IA.
        </p>
      )}
      {error && <p className="chapter-summary-error">{error}</p>}

      <div className="ai-split-compare">
        <section>
          <h4>Ahora ({before.count})</h4>
          <ul>
            {currentChapters.slice(0, 12).map((c, i) => (
              <li key={`cur-${i}`}>
                <strong>{c.title}</strong>
                <span>{wordCount(c.text).toLocaleString('es')} pal.</span>
              </li>
            ))}
            {currentChapters.length > 12 && (
              <li className="muted">…y {currentChapters.length - 12} más</li>
            )}
          </ul>
        </section>

        <section>
          <h4>
            Propuesta
            {after ? ` (${after.count})` : ''}
            {model ? ` · ${model}` : ''}
          </h4>
          {after && proposed ? (
            <ul>
              {proposed.slice(0, 12).map((c, i) => (
                <li key={`prop-${i}`}>
                  <strong>{c.title}</strong>
                  <span>{wordCount(c.text).toLocaleString('es')} pal.</span>
                </li>
              ))}
              {proposed.length > 12 && (
                <li className="muted">…y {proposed.length - 12} más</li>
              )}
            </ul>
          ) : (
            <p className="muted">Todavía no hay propuesta.</p>
          )}
        </section>
      </div>

      {proposed && phase === 'preview' && (
        <div className="ai-split-proposal-footer">
          <button
            type="button"
            className="btn primary"
            onClick={() => onAccept(proposed)}
          >
            Aceptar partición
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setProposed(null)
              setPhase('idle')
              onCancel()
            }}
          >
            Descartar
          </button>
        </div>
      )}
    </div>
  )
}
