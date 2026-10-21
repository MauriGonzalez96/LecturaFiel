import { useCallback, useEffect, useState } from 'react'

/**
 * Bridge con pywebview (mismo patrón que MixCS):
 * - Botón in-app → confirmación → api.close_app()
 * - X del SO → Python llama __lecturaFielRequestClose → mismo diálogo
 */
export function useDesktopClose() {
  const isDesktop =
    typeof window !== 'undefined' && Boolean(window.pywebview)

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
    try {
      window.pywebview?.api?.close_app()
    } catch {
      setClosing(false)
    }
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
