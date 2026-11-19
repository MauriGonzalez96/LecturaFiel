/** Repo público de Releases. */
export const GITHUB_REPO = 'MauriGonzalez96/Lektor'

export const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`

export const RELEASES_PAGE = `https://github.com/${GITHUB_REPO}/releases`

/** Si el usuario elige «Ahora no» para una versión, no insistir hasta otra. */
export const SKIP_UPDATE_KEY = 'lektor:skip-update-version'
