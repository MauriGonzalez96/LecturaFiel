/** Repo público de Releases (sin .git). */
export const GITHUB_REPO = 'MauriGonzalez96/LecturaFiel'

export const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`

export const RELEASES_PAGE = `https://github.com/${GITHUB_REPO}/releases`

/** Si el usuario elige «Ahora no» para una versión, no insistir hasta otra. */
export const SKIP_UPDATE_KEY = 'lectura-fiel:skip-update-version'
