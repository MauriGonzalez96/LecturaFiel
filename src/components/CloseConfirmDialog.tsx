import { createPortal } from 'react-dom'

interface Props {
  open: boolean
  closing: boolean
  onCancel: () => void
  onConfirm: () => void
}

/** Confirmación de cierre, siempre en el viewport (portal a body). */
export function CloseConfirmDialog({
  open,
  closing,
  onCancel,
  onConfirm,
}: Props) {
  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="modal-backdrop modal-backdrop-portal"
      role="presentation"
      onClick={onCancel}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="close-title">¿Cerrar Lectura Fiel?</h2>
        <p>
          Se cerrará la ventana y se terminarán todos los procesos de la
          aplicación.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={onConfirm}
            disabled={closing}
            autoFocus
          >
            {closing ? 'Cerrando…' : 'Cerrar'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
