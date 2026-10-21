import type { SubstitutionEvent } from '../types/lexicon'

interface Props {
  substitutions: SubstitutionEvent[]
  /** Abierto por defecto para no scrollear. */
  defaultOpen?: boolean
}

/** Lista de sustituciones del capítulo; va arriba del texto. */
export function ChangeLog({
  substitutions,
  defaultOpen = true,
}: Props) {
  if (substitutions.length === 0) return null

  return (
    <details className="change-log change-log-top" open={defaultOpen}>
      <summary>Cambios mínimos ({substitutions.length})</summary>
      <ul>
        {substitutions.map((s) => (
          <li key={`${s.tokenIndex}-${s.original}`}>
            <span className="from">{s.original}</span>
            <span className="arrow">→</span>
            <span className="to">{s.replacement}</span>
            <span className="lvl">N{s.entry.level}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
