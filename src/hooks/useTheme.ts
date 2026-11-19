import { useEffect, useState } from 'react'
import {
  applyResolvedTheme,
  readThemePreference,
  resolveTheme,
  systemPrefersDark,
  writeThemePreference,
  type ResolvedTheme,
  type ThemePreference,
} from '../theme/theme'

export function useTheme() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    readThemePreference(),
  )
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolveTheme(readThemePreference(), systemPrefersDark()),
  )

  useEffect(() => {
    const next = resolveTheme(preference, systemPrefersDark())
    setResolved(next)
    applyResolvedTheme(next)
  }, [preference])

  useEffect(() => {
    if (preference !== 'system' || typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const next = resolveTheme('system', mq.matches)
      setResolved(next)
      applyResolvedTheme(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [preference])

  function setPreference(next: ThemePreference) {
    writeThemePreference(next)
    setPreferenceState(next)
  }

  function cyclePreference() {
    const order: ThemePreference[] = ['light', 'dark', 'system']
    const i = order.indexOf(preference)
    setPreference(order[(i + 1) % order.length]!)
  }

  return {
    preference,
    resolved,
    setPreference,
    cyclePreference,
    isDark: resolved === 'dark',
  }
}
