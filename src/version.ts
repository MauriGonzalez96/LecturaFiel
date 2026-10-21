/** Versión de la app (inyectada desde package.json en el build). */
export const APP_VERSION: string =
  typeof import.meta.env.VITE_APP_VERSION === 'string' &&
  import.meta.env.VITE_APP_VERSION.length > 0
    ? import.meta.env.VITE_APP_VERSION
    : '0.0.0-dev'

export const APP_VERSION_LABEL = `v${APP_VERSION}`
