import { createPortal } from 'react-dom'
import { VoiceStudio } from './VoiceStudio'

interface Props {
  open: boolean
  onClose: () => void
}

/** Panel de voces desde Ajustes (portal); el reproductor queda a la izquierda. */
export function VoicesSettingsDialog({ open, onClose }: Props) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="modal-backdrop modal-backdrop-portal"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal voices-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Voces y velocidad"
        onClick={(e) => e.stopPropagation()}
      >
        <VoiceStudio compact onClose={onClose} />
      </div>
    </div>,
    document.body,
  )
}
