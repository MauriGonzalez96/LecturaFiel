import { beforeEach, describe, expect, it } from 'vitest'
import { migrateLegacyLocalStorage } from './migrateLegacy'

describe('migrateLegacyLocalStorage', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        get length() {
          return store.size
        },
        key: (i: number) => [...store.keys()][i] ?? null,
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v)
        },
        removeItem: (k: string) => {
          store.delete(k)
        },
      },
    })
  })

  it('copia claves lectura-fiel → lektor sin pisar', () => {
    localStorage.setItem('lectura-fiel:theme', 'dark')
    localStorage.setItem('lektor:voice-prefs', 'keep-me')
    localStorage.setItem('lectura-fiel:voice-prefs', 'old')

    migrateLegacyLocalStorage()

    expect(localStorage.getItem('lektor:theme')).toBe('dark')
    expect(localStorage.getItem('lektor:voice-prefs')).toBe('keep-me')
    expect(localStorage.getItem('lektor:migrated-from-lectura-fiel')).toBe('1')

    migrateLegacyLocalStorage()
    expect(localStorage.getItem('lektor:theme')).toBe('dark')
  })
})
