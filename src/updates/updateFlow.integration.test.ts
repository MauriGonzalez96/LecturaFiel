import { describe, expect, it, vi } from 'vitest'
import { isRemoteNewer } from './compareVersions'
import { isAllowedUpdateUrl } from './allowedUpdateUrl'
import { fetchLatestRelease } from './fetchLatestRelease'

describe('flujo update punta a punta (mocked GitHub)', () => {
  it('detecta release más nueva y URL exe segura', async () => {
    const payload = {
      tag_name: 'v9.9.9',
      name: 'Lektor 9.9.9',
      body: 'security + dark mode',
      html_url: 'https://github.com/MauriGonzalez96/Lektor/releases/tag/v9.9.9',
      published_at: '2026-11-18T00:00:00Z',
      assets: [
        {
          name: 'Lektor_9.9.9_x64-setup.exe',
          browser_download_url:
            'https://github.com/MauriGonzalez96/Lektor/releases/download/v9.9.9/Lektor_9.9.9_x64-setup.exe',
        },
      ],
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => payload,
      }),
    )

    const result = await fetchLatestRelease('4.0.2')
    expect('none' in result).toBe(false)
    if ('none' in result) return

    expect(result.newer).toBe(true)
    expect(isRemoteNewer('4.0.2', result.release.version)).toBe(true)
    expect(result.release.downloadUrl).toBeTruthy()
    expect(isAllowedUpdateUrl(result.release.downloadUrl!)).toBe(true)
  })

  it('si el asset no es exe, downloadUrl queda null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          tag_name: 'v9.9.9',
          name: 'x',
          body: '',
          html_url: 'https://github.com/MauriGonzalez96/Lektor/releases/tag/v9.9.9',
          published_at: null,
          assets: [
            {
              name: 'notes.md',
              browser_download_url:
                'https://github.com/MauriGonzalez96/Lektor/releases/download/v9.9.9/notes.md',
            },
          ],
        }),
      }),
    )

    const result = await fetchLatestRelease('4.0.2')
    if ('none' in result) throw new Error('expected release')
    expect(result.release.downloadUrl).toBeNull()
  })
})
