/**
 * Bridge de escritorio Tauri (o web pura en el navegador).
 */
import { APP_VERSION } from '../version'

export type DesktopKind = 'tauri' | 'web'

function hasTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    // Tauri 2 inyecta __TAURI_INTERNALS__
    Boolean(
      (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
    )
  )
}

export function getDesktopKind(): DesktopKind {
  return hasTauri() ? 'tauri' : 'web'
}

export function isDesktopShell(): boolean {
  return getDesktopKind() === 'tauri'
}

export async function closeDesktopApp(): Promise<void> {
  if (getDesktopKind() !== 'tauri') return
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('close_app')
}

export async function desktopAppVersion(): Promise<string> {
  if (getDesktopKind() !== 'tauri') return APP_VERSION
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke<string>('app_version')
  } catch {
    return APP_VERSION
  }
}
