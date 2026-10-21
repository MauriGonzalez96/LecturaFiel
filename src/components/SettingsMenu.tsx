import { useEffect, useId, useRef, useState } from 'react'
import { useAppUpdate } from '../hooks/useAppUpdate'
import { useDesktopClose } from '../hooks/useDesktopClose'
import {
  INTERVENTION_OPTIONS,
  type InterventionMode,
} from '../settings/intervention'
import { APP_VERSION_LABEL } from '../version'
import { UpdateDialog } from './UpdateDialog'

interface Props {
  onOpenVoices: () => void
  onClearCache: () => void
  onDemo?: () => void
  demoEnabled?: boolean
  interventionMode: InterventionMode
  onInterventionMode: (mode: InterventionMode) => void
  /** Tras elegir nivel: cierra el menú y confirma en pantalla. */
  onInterventionApplied?: (mode: InterventionMode) => void
}

/** Tuerca de configuración (voces, updates, caché, demo, cerrar). */
export function SettingsMenu({
  onOpenVoices,
  onClearCache,
  onDemo,
  demoEnabled = false,
  interventionMode,
  onInterventionMode,
  onInterventionApplied,
}: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const update = useAppUpdate()
  const {
    isDesktop,
    confirmOpen,
    closing,
    requestClose,
    cancelClose,
    confirmClose,
  } = useDesktopClose()

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function run(action: () => void) {
    setOpen(false)
    action()
  }

  return (
    <div className="settings-menu" ref={rootRef}>
      <button
        type="button"
        className={`icon-btn settings-gear${open ? ' open' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title="Configuración"
        aria-label="Configuración"
        onClick={() => setOpen((v) => !v)}
      >
        <GearIcon />
      </button>

      {open && (
        <div
          id={menuId}
          className="settings-dropdown"
          role="menu"
          aria-label="Configuración"
        >
          <p className="settings-version">{APP_VERSION_LABEL}</p>

          <div
            className="settings-block"
            role="none"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <label className="settings-field" htmlFor="intervention-mode">
              Nivel de reemplazo (1 fiel → 4 simple)
              <select
                id="intervention-mode"
                value={interventionMode}
                onChange={(e) => {
                  const next = e.target.value as InterventionMode
                  onInterventionMode(next)
                  onInterventionApplied?.(next)
                  setOpen(false)
                }}
              >
                {INTERVENTION_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="settings-hint">
              {
                INTERVENTION_OPTIONS.find((o) => o.id === interventionMode)
                  ?.hint
              }
            </p>
            <p className="settings-hint settings-hint-strong">
              Al cambiar, se reaplica al texto al instante. Mirá «sustituidas»
              y la columna «Se lee».
            </p>
          </div>

          <div className="settings-sep" role="separator" />

          <button
            type="button"
            role="menuitem"
            className="settings-item"
            onClick={() => run(onOpenVoices)}
          >
            Voces y velocidad
          </button>

          <button
            type="button"
            role="menuitem"
            className="settings-item"
            disabled={update.status === 'checking'}
            onClick={() => {
              setOpen(false)
              update.checkNow()
            }}
          >
            {update.status === 'checking'
              ? 'Buscando actualizaciones…'
              : 'Buscar actualizaciones'}
          </button>

          <button
            type="button"
            role="menuitem"
            className="settings-item"
            onClick={() =>
              run(() => {
                onClearCache()
              })
            }
          >
            Limpiar caché léxica
          </button>

          {demoEnabled && onDemo && (
            <button
              type="button"
              role="menuitem"
              className="settings-item"
              onClick={() => run(onDemo)}
            >
              Capítulo demo
            </button>
          )}

          {isDesktop && (
            <>
              <div className="settings-sep" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="settings-item settings-item-danger"
                onClick={() => run(requestClose)}
              >
                Cerrar Lectura Fiel
              </button>
            </>
          )}
        </div>
      )}

      <UpdateDialog update={update} />

      {confirmOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={cancelClose}
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
    </div>
  )
}

function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.2 7.2 0 0 0-1.62-.94l-.36-2.54A.48.48 0 0 0 14 2h-4a.48.48 0 0 0-.48.42l-.36 2.54c-.59.22-1.13.54-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.64 8.48a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.76 14.5a.49.49 0 0 0-.12.61l1.92 3.32c.13.22.4.3.59.22l2.39-.96c.49.4 1.03.72 1.62.94l.36 2.54c.05.24.25.42.48.42h4c.24 0 .44-.18.48-.42l.36-2.54c.59-.22 1.13-.54 1.62-.94l2.39.96c.22.08.46 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"
      />
    </svg>
  )
}
