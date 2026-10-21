import {
  INTERVENTION_OPTIONS,
  type InterventionMode,
} from '../settings/intervention'
import type { PipelineResult } from '../types/lexicon'

interface Props {
  result: PipelineResult
  mode: InterventionMode
}

export function StatsBar({ result, mode }: Props) {
  const s = result.stats
  const label =
    INTERVENTION_OPTIONS.find((o) => o.id === mode)?.label ?? `Nivel ${mode}`

  return (
    <div className="stats" role="status">
      <div className="stats-mode" title="Nivel de reemplazo activo">
        <strong>{mode}</strong>
        <span>{label.replace(/^\d+\s*—\s*/, '')}</span>
      </div>
      <div>
        <strong>{s.wordsAnalyzed}</strong>
        <span>palabras</span>
      </div>
      <div>
        <strong>{s.candidatesFound}</strong>
        <span>candidatas</span>
      </div>
      <div>
        <strong>{s.rarityDetected}</strong>
        <span>por rareza</span>
      </div>
      <div className={s.substituted > 0 ? 'stats-hot' : undefined}>
        <strong>{s.substituted}</strong>
        <span>sustituidas</span>
      </div>
      <div>
        <strong>{s.glossaryOnly}</strong>
        <span>solo glosario</span>
      </div>
      <div>
        <strong>{s.preservedLiterary}</strong>
        <span>literarias intactas</span>
      </div>
    </div>
  )
}
