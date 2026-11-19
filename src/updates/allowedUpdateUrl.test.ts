import { describe, expect, it } from 'vitest'
import {
  isAllowedUpdateUrl,
  safeInstallerFileName,
} from './allowedUpdateUrl'

describe('isAllowedUpdateUrl (seguridad)', () => {
  it('acepta release GitHub .exe', () => {
    expect(
      isAllowedUpdateUrl(
        'https://github.com/MauriGonzalez96/Lektor/releases/download/v4.0.2/Lektor_4.0.2_x64-setup.exe',
      ),
    ).toBe(true)
  })

  it('acepta objects.githubusercontent.com', () => {
    expect(
      isAllowedUpdateUrl(
        'https://objects.githubusercontent.com/github-production-release-asset/123/abc.exe',
      ),
    ).toBe(true)
  })

  it('rechaza http', () => {
    expect(
      isAllowedUpdateUrl(
        'http://github.com/MauriGonzalez96/Lektor/releases/download/v1/x.exe',
      ),
    ).toBe(false)
  })

  it('rechaza host con substring engañoso', () => {
    expect(
      isAllowedUpdateUrl('https://evil.com/githubusercontent.com/payload.exe'),
    ).toBe(false)
    expect(
      isAllowedUpdateUrl('https://githubusercontent.com.evil.com/x.exe'),
    ).toBe(false)
    expect(
      isAllowedUpdateUrl('https://evil-github.com/Mauri/Lektor/x.exe'),
    ).toBe(false)
  })

  it('rechaza no-exe, javascript y paths fuera de releases/download', () => {
    expect(
      isAllowedUpdateUrl(
        'https://github.com/MauriGonzalez96/Lektor/releases/download/v1/notes.md',
      ),
    ).toBe(false)
    expect(
      isAllowedUpdateUrl(
        'https://github.com/MauriGonzalez96/Lektor/../evil.exe',
      ),
    ).toBe(false)
    expect(isAllowedUpdateUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedUpdateUrl('file:///C:/Windows/System32/cmd.exe')).toBe(
      false,
    )
  })

  it('rechaza URL inválida', () => {
    expect(isAllowedUpdateUrl('not-a-url')).toBe(false)
    expect(isAllowedUpdateUrl('')).toBe(false)
  })
})

describe('safeInstallerFileName', () => {
  it('toma el basename .exe', () => {
    expect(
      safeInstallerFileName(
        'https://github.com/o/r/releases/download/v1/Lektor_4.0.2_x64-setup.exe',
      ),
    ).toBe('Lektor_4.0.2_x64-setup.exe')
  })

  it('sanitiza caracteres raros / traversal', () => {
    expect(
      safeInstallerFileName(
        'https://github.com/o/r/releases/download/v1/..%2F..%2Fevil.exe',
      ),
    ).toBe('Lektor-Setup.exe')
  })
})
