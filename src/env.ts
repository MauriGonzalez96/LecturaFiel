/** true solo con `npm run dev` (Vite). El .exe siempre es producción. */
export const IS_DEV = import.meta.env.DEV

/** Ventana pywebview / LecturaFiel.exe */
export function isDesktopShell(): boolean {
  return typeof window !== 'undefined' && Boolean(window.pywebview)
}

/** La demo de ejemplo solo existe en desarrollo web. */
export const DEMO_ENABLED = IS_DEV && !isDesktopShell()
