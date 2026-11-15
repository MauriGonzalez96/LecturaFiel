/**
 * Bridge de escritorio: Tauri (preferido) o pywebview (legacy).
 */
import { APP_VERSION } from '../version'

export type DesktopKind = 'tauri' | 'pywebview' | 'web'

function hasTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    // Tauri 2 inyecta __TAURI_INTERNALS__
    Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__)
  )
}

function hasPywebview(): boolean {
  return typeof window !== 'undefined' && Boolean(window.pywebview)
}

export function getDesktopKind(): DesktopKind {
  if (hasTauri()) return 'tauri'
  if (hasPywebview()) return 'pywebview'
  return 'web'
}

export function isDesktopShell(): boolean {
  return getDesktopKind() !== 'web'
}

export async function closeDesktopApp(): Promise<void> {
  const kind = getDesktopKind()
  if (kind === 'tauri') {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('close_app')
    return
  }
  if (kind === 'pywebview') {
    window.pywebview?.api?.close_app()
  }
}

export async function desktopAppVersion(): Promise<string> {
  const kind = getDesktopKind()
  if (kind === 'tauri') {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      return await invoke<string>('app_version')
    } catch {
      return APP_VERSION
    }
  }
  return APP_VERSION
}
