import { isDesktopShell as desktopShell } from './desktop/bridge'

/** true solo con `npm run dev` (Vite). El .exe siempre es producción. */
export const IS_DEV = import.meta.env.DEV

/** Ventana Tauri (escritorio). */
export function isDesktopShell(): boolean {
  return desktopShell()
}

/** La demo de ejemplo solo existe en desarrollo web. */
export const DEMO_ENABLED = IS_DEV && !isDesktopShell()
