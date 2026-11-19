import { describe, expect, it, vi } from 'vitest'
import { startUpdateDownload } from './startUpdateDownload'
import type { LatestRelease } from './fetchLatestRelease'

function release(partial: Partial<LatestRelease> = {}): LatestRelease {
  return {
    tag: 'v9.9.9',
    version: '9.9.9',
    name: 'v9.9.9',
    body: '',
    htmlUrl: 'https://github.com/MauriGonzalez96/Lektor/releases/tag/v9.9.9',
    publishedAt: null,
    downloadUrl:
      'https://github.com/MauriGonzalez96/Lektor/releases/download/v9.9.9/setup.exe',
    assetName: 'setup.exe',
    ...partial,
  }
}

describe('startUpdateDownload seguridad', () => {
  it('rechaza URL maliciosa antes de cualquier descarga', async () => {
    const open = vi.fn()
    vi.stubGlobal('open', open)

    await expect(
      startUpdateDownload(
        release({
          downloadUrl: 'https://evil.example/malware.exe',
        }),
      ),
    ).rejects.toThrow(/no permitida/i)

    expect(open).not.toHaveBeenCalled()
  })

  it('rechaza javascript: y file:', async () => {
    await expect(
      startUpdateDownload(release({ downloadUrl: 'javascript:alert(1)' })),
    ).rejects.toThrow(/no permitida/i)

    await expect(
      startUpdateDownload(
        release({ downloadUrl: 'file:///C:/Temp/evil.exe' }),
      ),
    ).rejects.toThrow(/no permitida/i)
  })

  it('rechaza host que solo contiene el substring githubusercontent', async () => {
    await expect(
      startUpdateDownload(
        release({
          downloadUrl: 'https://evil.com/githubusercontent.com/payload.exe',
        }),
      ),
    ).rejects.toThrow(/no permitida/i)
  })
})
