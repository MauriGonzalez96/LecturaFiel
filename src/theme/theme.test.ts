import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyResolvedTheme,
  isThemePreference,
  readThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  writeThemePreference,
} from './theme'

describe('theme', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    })
  })

  it('valida preferencias', () => {
    expect(isThemePreference('dark')).toBe(true)
    expect(isThemePreference('neon')).toBe(false)
  })

  it('resuelve system según prefersDark', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('persiste y lee preferencia', () => {
    writeThemePreference('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(readThemePreference()).toBe('dark')
  })

  it('aplica data-theme en html', () => {
    const el = {
      dataset: {} as Record<string, string>,
      style: { colorScheme: '' },
    }
    vi.stubGlobal('document', { documentElement: el })
    applyResolvedTheme('dark')
    expect(el.dataset.theme).toBe('dark')
    expect(el.style.colorScheme).toBe('dark')
  })
})
