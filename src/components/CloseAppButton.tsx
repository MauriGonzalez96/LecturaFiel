import { useDesktopClose } from '../hooks/useDesktopClose'

/** Botón de apagado + diálogo de confirmación (solo en el .exe / pywebview). */
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
        title="Cerrar Lectura Fiel"
        aria-label="Cerrar Lectura Fiel"
      >
        <span className="close-icon" aria-hidden="true">
          ⌁
        </span>
        Cerrar
      </button>

      {confirmOpen && (
        <div className="modal-backdrop" role="presentation" onClick={cancelClose}>
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
              <button type="button" className="btn ghost" onClick={cancelClose}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn danger"
                onClick={confirmClose}
                disabled={closing}
              >
                {closing ? 'Cerrando…' : 'Cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
