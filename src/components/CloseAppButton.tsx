import { useDesktopClose } from '../hooks/useDesktopClose'
import { CloseConfirmDialog } from './CloseConfirmDialog'

/** Botón de apagado + diálogo de confirmación (solo en la app Tauri). */
export function CloseAppButton() {
  const {
    isDesktop,
    confirmOpen,
    closing,
    requestClose,
    cancelClose,
    confirmClose,
  } = useDesktopClose()

  if (!isDesktop) return null

  return (
    <>
      <button
        type="button"
        className="btn close-app"
        onClick={requestClose}
        disabled={closing}
        title="Cerrar Lektor"
        aria-label="Cerrar Lektor"
      >
        <span className="close-icon" aria-hidden="true">
          ⌁
        </span>
        Cerrar
      </button>

      <CloseConfirmDialog
        open={confirmOpen}
        closing={closing}
        onCancel={cancelClose}
        onConfirm={confirmClose}
      />
    </>
  )
}
