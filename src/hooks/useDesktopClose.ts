import { useCallback, useEffect, useState } from 'react'
import { closeDesktopApp, isDesktopShell } from '../desktop/bridge'

/**
 * Cierre de escritorio (Tauri o pywebview):
 * - Botón in-app → confirmación → closeDesktopApp()
 * - X del SO → __lecturaFielRequestClose → mismo diálogo
 */
export function useDesktopClose() {
  const isDesktop = isDesktopShell()

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [closing, setClosing] = useState(false)

  const requestClose = useCallback(() => {
    if (closing) return
    setConfirmOpen(true)
  }, [closing])

  const cancelClose = useCallback(() => {
    if (closing) return
    setConfirmOpen(false)
  }, [closing])

  const confirmClose = useCallback(() => {
    setClosing(true)
    setConfirmOpen(false)
    void closeDesktopApp().catch(() => setClosing(false))
  }, [])

  useEffect(() => {
    if (!isDesktop) return
    window.__lecturaFielRequestClose = requestClose
    return () => {
      delete window.__lecturaFielRequestClose
    }
  }, [isDesktop, requestClose])

  return {
    isDesktop,
    confirmOpen,
    closing,
    requestClose,
    cancelClose,
    confirmClose,
  }
}
