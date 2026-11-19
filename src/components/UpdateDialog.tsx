import { useId } from 'react'
import type { useAppUpdate, UpdateUiStatus } from '../hooks/useAppUpdate'
import { RELEASES_PAGE } from '../updates/config'
import { APP_VERSION_LABEL } from '../version'

type UpdateApi = ReturnType<typeof useAppUpdate>

/** Popup de actualizaciones (sin botón propio). */
export function UpdateDialog({ update }: { update: UpdateApi }) {
  const titleId = useId()
  if (!update.popupOpen) return null

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={() => {
        if (update.status === 'available') update.dismiss()
        else update.closePopup()
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
          status={update.status}
          release={update.release}
          error={update.error}
          localVersion={update.localVersion}
          onDismiss={update.dismiss}
          onAccept={update.acceptUpdate}
          onClose={update.closePopup}
        />
      </div>
    </div>
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
  release: UpdateApi['release']
  error: string | null
  localVersion: string
  onDismiss: () => void
  onAccept: () => void | Promise<void>
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
        <h2 id={titleId}>Actualizando…</h2>
        <p>
          Descargando <strong>{release.assetName ?? release.tag}</strong> e
          iniciando el instalador. La app se cerrará sola para poder
          reemplazarla.
        </p>
        <p className="update-meta">
          Si no se abre el instalador, usá{' '}
          <a href={release.htmlUrl} target="_blank" rel="noreferrer">
            la página del release
          </a>
          .
        </p>
      </>
    )
  }

  if (status === 'installFailed') {
    return (
      <>
        <h2 id={titleId}>No se pudo actualizar</h2>
        <p>{error ?? 'Error desconocido al instalar la actualización.'}</p>
        <p className="update-meta">
          Podés instalar a mano desde{' '}
          <a href={RELEASES_PAGE} target="_blank" rel="noreferrer">
            GitHub Releases
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
            ? 'Al actualizar se descarga el instalador, se abre y Lektor se cierra para completar el update.'
            : 'No hay .exe en el release; te abrimos la página de GitHub.'}
        </p>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onDismiss}>
            Ahora no
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={() => void onAccept()}
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
