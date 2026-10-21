import { useCallback, useEffect, useRef, useState } from 'react'
import { SKIP_UPDATE_KEY } from '../updates/config'
import {
  fetchLatestRelease,
  startUpdateDownload,
  type LatestRelease,
} from '../updates/fetchLatestRelease'
import { APP_VERSION } from '../version'

export type UpdateUiStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'upToDate'
  | 'noReleases'
  | 'error'
  | 'downloading'

function readSkipped(): string | null {
  try {
    return localStorage.getItem(SKIP_UPDATE_KEY)
  } catch {
    return null
  }
}

function writeSkipped(version: string) {
  try {
    localStorage.setItem(SKIP_UPDATE_KEY, version)
  } catch {
    /* ignore */
  }
}

export function useAppUpdate() {
  const [status, setStatus] = useState<UpdateUiStatus>('idle')
  const [release, setRelease] = useState<LatestRelease | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [popupOpen, setPopupOpen] = useState(false)
  const [autoChecked, setAutoChecked] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const runCheck = useCallback(async (opts?: { manual?: boolean }) => {
    const manual = Boolean(opts?.manual)
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    setStatus('checking')
    setError(null)
    if (manual) setPopupOpen(false)

    try {
      const result = await fetchLatestRelease(APP_VERSION, ac.signal)
      if (ac.signal.aborted) return

      if ('none' in result) {
        setRelease(null)
        setStatus('noReleases')
        if (manual) setPopupOpen(true)
        return
      }

      setRelease(result.release)

      if (result.newer) {
        const skipped = readSkipped()
        if (!manual && skipped === result.release.version) {
          setStatus('available')
          setPopupOpen(false)
          return
        }
        setStatus('available')
        setPopupOpen(true)
        return
      }

      setStatus('upToDate')
      if (manual) setPopupOpen(true)
    } catch (err) {
      if (ac.signal.aborted) return
      setStatus('error')
      setError(
        err instanceof Error ? err.message : 'Error al buscar actualizaciones.',
      )
      if (manual) setPopupOpen(true)
    }
  }, [])

  /** Chequeo silencioso al abrir (una vez). */
  useEffect(() => {
    if (autoChecked) return
    setAutoChecked(true)
    const t = window.setTimeout(() => {
      void runCheck({ manual: false })
    }, 2500)
    return () => window.clearTimeout(t)
  }, [autoChecked, runCheck])

  useEffect(() => {
    return () => abortRef.current?.abort()
  }, [])

  const dismiss = useCallback(() => {
    if (release && status === 'available') {
      writeSkipped(release.version)
    }
    setPopupOpen(false)
  }, [release, status])

  const acceptUpdate = useCallback(() => {
    if (!release) return
    setStatus('downloading')
    startUpdateDownload(release)
    // Tras disparar la descarga, dejamos el popup con instrucciones
  }, [release])

  const closePopup = useCallback(() => {
    setPopupOpen(false)
    if (status === 'downloading') setStatus('available')
  }, [status])

  const checkNow = useCallback(() => {
    void runCheck({ manual: true })
  }, [runCheck])

  return {
    status,
    release,
    error,
    popupOpen,
    localVersion: APP_VERSION,
    checkNow,
    dismiss,
    acceptUpdate,
    closePopup,
  }
}
