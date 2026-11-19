export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'lektor:theme'

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

export function readThemePreference(
  storage: Pick<Storage, 'getItem'> | null = typeof localStorage !== 'undefined'
    ? localStorage
    : null,
): ThemePreference {
  try {
    const raw = storage?.getItem(THEME_STORAGE_KEY)
    if (isThemePreference(raw)) return raw
  } catch {
    /* ignore */
  }
  return 'system'
}

export function writeThemePreference(
  preference: ThemePreference,
  storage: Pick<Storage, 'setItem'> | null = typeof localStorage !== 'undefined'
    ? localStorage
    : null,
): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    /* ignore */
  }
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark = false,
): ResolvedTheme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light'
  return preference
}

export function systemPrefersDark(
  matchMedia: ((query: string) => { matches: boolean }) | null = typeof window !==
  'undefined'
    ? window.matchMedia.bind(window)
    : null,
): boolean {
  try {
    return Boolean(matchMedia?.('(prefers-color-scheme: dark)')?.matches)
  } catch {
    return false
  }
}

/** Aplica data-theme + color-scheme en <html>. */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.theme = resolved
  root.style.colorScheme = resolved
}
