import { useId } from 'react'
import { RELEASES_PAGE } from '../updates/config'
import { useAppUpdate, type UpdateUiStatus } from '../hooks/useAppUpdate'
import { APP_VERSION_LABEL } from '../version'

/** Botón «Buscar actualizaciones» + popup al detectar versión nueva. */
export function UpdateChecker() {
  const {
    status,
    release,
    error,
    popupOpen,
    localVersion,
    checkNow,
    dismiss,
    acceptUpdate,
    closePopup,
  } = useAppUpdate()
  const titleId = useId()

  const checking = status === 'checking'

  return (
    <>
      <button
        type="button"
        className="btn ghost update-check-btn"
        onClick={checkNow}
        disabled={checking}
        title="Consultar GitHub Releases"
      >
        {checking ? 'Buscando…' : 'Buscar actualizaciones'}
      </button>

      {popupOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => {
            if (status === 'available') dismiss()
            else closePopup()
          }}
        >
          <div
            className="modal update-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(e) => e.stopPropagation()}
          >
            <UpdateModalBody
              titleId={titleId}
              status={status}
              release={release}
              error={error}
              localVersion={localVersion}
              onDismiss={dismiss}
              onAccept={acceptUpdate}
              onClose={closePopup}
            />
          </div>
        </div>
      )}
    </>
  )
}

function UpdateModalBody({
  titleId,
  status,
  release,
  error,
  localVersion,
  onDismiss,
  onAccept,
  onClose,
}: {
  titleId: string
  status: UpdateUiStatus
  release: ReturnType<typeof useAppUpdate>['release']
  error: string | null
  localVersion: string
  onDismiss: () => void
  onAccept: () => void
  onClose: () => void
}) {
  if (status === 'checking') {
    return (
      <>
        <h2 id={titleId}>Buscando actualizaciones…</h2>
        <p>Consultando GitHub Releases.</p>
      </>
    )
  }

  if (status === 'error') {
    return (
      <>
        <h2 id={titleId}>No se pudo comprobar</h2>
        <p>{error ?? 'Error desconocido.'}</p>
        <p className="update-meta">
          También podés mirar{' '}
          <a href={RELEASES_PAGE} target="_blank" rel="noreferrer">
            las releases en GitHub
          </a>
          .
        </p>
        <div className="modal-actions">
          <button type="button" className="btn primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </>
    )
  }

  if (status === 'noReleases') {
    return (
      <>
        <h2 id={titleId}>Sin releases todavía</h2>
        <p>
          El repositorio aún no tiene una versión publicada en GitHub Releases.
          Cuando subas un <code>.exe</code> a un release, la app lo va a
          detectar acá.
        </p>
        <p className="update-meta">
          Versión instalada: <strong>{APP_VERSION_LABEL}</strong>
        </p>
        <div className="modal-actions">
          <a
            className="btn ghost"
            href={RELEASES_PAGE}
            target="_blank"
            rel="noreferrer"
          >
            Abrir GitHub
          </a>
          <button type="button" className="btn primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </>
    )
  }

  if (status === 'upToDate') {
    return (
      <>
        <h2 id={titleId}>Estás al día</h2>
        <p>
          Tenés la última versión publicada (
          <strong>{APP_VERSION_LABEL}</strong>).
        </p>
        <div className="modal-actions">
          <button type="button" className="btn primary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </>
    )
  }

  if (status === 'downloading' && release) {
    return (
      <>
        <h2 id={titleId}>Descarga iniciada</h2>
        <p>
          Se está bajando <strong>{release.assetName ?? release.tag}</strong>.
          Cuando termine, <strong>cerrá esta app</strong> y abrí el nuevo{' '}
          <code>.exe</code> (no se puede reemplazar el que está en uso).
        </p>
        <p className="update-meta">
          Si el navegador/bloqueó la descarga, usá{' '}
          <a href={release.htmlUrl} target="_blank" rel="noreferrer">
            la página del release
          </a>
          .
        </p>
        <div className="modal-actions">
          <button type="button" className="btn primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </>
    )
  }

  if (status === 'available' && release) {
    const notes =
      release.body.length > 280
        ? `${release.body.slice(0, 277)}…`
        : release.body

    return (
      <>
        <h2 id={titleId}>Hay una actualización</h2>
        <p>
          Tenés <strong>v{localVersion}</strong>. Está disponible{' '}
          <strong>v{release.version}</strong>
          {release.name && release.name !== release.tag
            ? ` (${release.name})`
            : ''}
          .
        </p>
        {notes ? (
          <div className="update-notes">
            <p className="update-notes-label">Novedades</p>
            <pre>{notes}</pre>
          </div>
        ) : null}
        <p className="update-meta">
          {release.downloadUrl
            ? 'Al actualizar se descarga el .exe. Después cerrá Lectura Fiel y abrí el nuevo archivo.'
            : 'No hay .exe en el release; te abrimos la página de GitHub.'}
        </p>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onDismiss}>
            Ahora no
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={onAccept}
            autoFocus
          >
            Actualizar
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <h2 id={titleId}>Actualizaciones</h2>
      <p>No hay información de versión por ahora.</p>
      <div className="modal-actions">
        <button type="button" className="btn primary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </>
  )
}
