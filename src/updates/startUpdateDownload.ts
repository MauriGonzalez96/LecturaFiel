import { isAllowedUpdateUrl } from './allowedUpdateUrl'
import type { LatestRelease } from './fetchLatestRelease'

async function isTauriShell(): Promise<boolean> {
  try {
    const { getDesktopKind } = await import('../desktop/bridge')
    return getDesktopKind() === 'tauri'
  } catch {
    return false
  }
}

/**
 * En Tauri: valida URL, descarga, abre instalador y cierra.
 * En web/dev: dispara descarga por enlace (también valida URL).
 */
export async function startUpdateDownload(release: LatestRelease): Promise<void> {
  if (release.downloadUrl) {
    if (!isAllowedUpdateUrl(release.downloadUrl)) {
      throw new Error('URL de actualización no permitida.')
    }
    if (await isTauriShell()) {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('install_update', { url: release.downloadUrl })
      return
    }
    const a = document.createElement('a')
    a.href = release.downloadUrl
    a.rel = 'noopener noreferrer'
    a.download = release.assetName ?? `Lektor-v${release.version}.exe`
    document.body.appendChild(a)
    a.click()
    a.remove()
    return
  }

  window.open(release.htmlUrl, '_blank', 'noopener,noreferrer')
}
