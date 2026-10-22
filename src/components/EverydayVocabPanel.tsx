import { useState, type FormEvent } from 'react'

interface Props {
  words: string[]
  onAdd: (...words: string[]) => number
  onRemove: (word: string) => void
  onClear: () => void
  onChanged?: () => void
}

/**
 * Lista editable de palabras que el lector considera cotidianas
 * (no se buscan ni se reemplazan).
 */
export function EverydayVocabPanel({
  words,
  onAdd,
  onRemove,
  onClear,
  onChanged,
}: Props) {
  const [draft, setDraft] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const parts = draft
      .split(/[,;\s]+/)
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length === 0) return
    const n = onAdd(...parts)
    setDraft('')
    setMsg(
      n === 0
        ? 'Ya estaban en tu lista.'
        : n === 1
          ? 'Agregada: no se cambiará.'
          : `Agregadas ${n} palabras: no se cambiarán.`,
    )
    onChanged?.()
  }

  return (
    <div className="everyday-panel">
      <header className="everyday-panel-head">
        <h3>Mi vocabulario cotidiano</h3>
        <p>
          Palabras que agregues acá no se marcan ni se reemplazan, aunque el
          capítulo las detecte como difíciles.
        </p>
      </header>

      <form className="everyday-add" onSubmit={submit}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ej. planificación, empero…"
          aria-label="Agregar palabras cotidianas"
        />
        <button type="submit" className="btn primary" disabled={!draft.trim()}>
          Agregar
        </button>
      </form>
      {msg && (
        <p className="everyday-msg" role="status">
          {msg}
        </p>
      )}

      {words.length === 0 ? (
        <p className="everyday-empty">Todavía no agregaste ninguna.</p>
      ) : (
        <>
          <ul className="everyday-list">
            {words.map((w) => (
              <li key={w}>
                <span>{w}</span>
                <button
                  type="button"
                  className="btn ghost"
                  title="Quitar de cotidianas"
                  onClick={() => {
                    onRemove(w)
                    onChanged?.()
                    setMsg(`Quitada: «${w}» vuelve a poder marcarse.`)
                  }}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn ghost everyday-clear"
            onClick={() => {
              if (
                !window.confirm(
                  `¿Vaciar las ${words.length} palabras cotidianas tuyas?`,
                )
              ) {
                return
              }
              onClear()
              onChanged?.()
              setMsg('Lista vaciada.')
            }}
          >
            Vaciar lista ({words.length})
          </button>
        </>
      )}
    </div>
  )
}
