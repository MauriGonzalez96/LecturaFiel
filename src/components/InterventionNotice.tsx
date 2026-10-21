import {
  INTERVENTION_OPTIONS,
  type InterventionMode,
} from '../settings/intervention'

interface Props {
  mode: InterventionMode
  substituted: number
  rarity: number
  glossaryOnly: number
  onDismiss: () => void
}

/** Aviso visible tras cambiar el nivel de reemplazo. */
export function InterventionNotice({
  mode,
  substituted,
  rarity,
  glossaryOnly,
  onDismiss,
}: Props) {
  const opt = INTERVENTION_OPTIONS.find((o) => o.id === mode)
  return (
    <div className="intervention-notice" role="status" aria-live="polite">
      <div className="intervention-notice-body">
        <strong>Nivel aplicado: {opt?.label ?? mode}</strong>
        <p>
          {substituted > 0
            ? `${substituted} palabra${substituted === 1 ? '' : 's'} cambiada${substituted === 1 ? '' : 's'} en «Se lee».`
            : 'Ninguna palabra tenía sinónimo curado en este capítulo.'}{' '}
          {rarity > 0
            ? `${rarity} detectada${rarity === 1 ? '' : 's'} por rareza`
            : 'Sin rareza automática'}
          {glossaryOnly > 0
            ? ` · ${glossaryOnly} solo en glosario (sin cambio en el texto).`
            : '.'}
        </p>
        <p className="intervention-notice-hint">{opt?.hint}</p>
      </div>
      <button
        type="button"
        className="btn ghost"
        onClick={onDismiss}
        aria-label="Cerrar aviso"
      >
        Entendido
      </button>
    </div>
  )
}
