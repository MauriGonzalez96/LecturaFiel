import type { PipelineResult } from '../types/lexicon'

export function StatsBar({ result }: { result: PipelineResult }) {
  const s = result.stats
  return (
    <div className="stats" role="status">
      <div>
        <strong>{s.wordsAnalyzed}</strong>
        <span>palabras</span>
      </div>
      <div>
        <strong>{s.candidatesFound}</strong>
        <span>candidatas (N2–3)</span>
      </div>
      <div>
        <strong>{s.rarityDetected}</strong>
        <span>por rareza</span>
      </div>
      <div>
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
