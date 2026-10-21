import { RELEASES_API } from './config'
import { isRemoteNewer } from './compareVersions'

export interface LatestRelease {
  tag: string
  version: string
  name: string
  body: string
  htmlUrl: string
  publishedAt: string | null
  downloadUrl: string | null
  assetName: string | null
}

interface GhAsset {
  name: string
  browser_download_url: string
  content_type?: string
  size?: number
}

interface GhRelease {
  tag_name: string
  name: string | null
  body: string | null
  html_url: string
  published_at: string | null
  assets: GhAsset[]
}

function pickExeAsset(assets: GhAsset[], version: string): GhAsset | null {
  const exes = assets.filter((a) => /\.exe$/i.test(a.name))
  if (exes.length === 0) return null

  const versioned = exes.find(
    (a) =>
      a.name.toLowerCase() === `lecturafiel-v${version}.exe`.toLowerCase() ||
      a.name.toLowerCase().includes(`-v${version}.exe`.toLowerCase()),
  )
  if (versioned) return versioned

  const plain = exes.find((a) => a.name.toLowerCase() === 'lecturafiel.exe')
  if (plain) return plain

  return exes[0] ?? null
}

export async function fetchLatestRelease(
  localVersion: string,
  signal?: AbortSignal,
): Promise<{ release: LatestRelease; newer: boolean } | { none: true }> {
  const res = await fetch(RELEASES_API, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal,
  })

  if (res.status === 404) {
    return { none: true }
  }
  if (!res.ok) {
    throw new Error(
      `No se pudo consultar GitHub (${res.status}). Probá más tarde.`,
    )
  }

  const data = (await res.json()) as GhRelease
  const version = data.tag_name.replace(/^v/i, '')
  const asset = pickExeAsset(data.assets ?? [], version)

  const release: LatestRelease = {
    tag: data.tag_name,
    version,
    name: data.name?.trim() || data.tag_name,
    body: (data.body ?? '').trim(),
    htmlUrl: data.html_url,
    publishedAt: data.published_at,
    downloadUrl: asset?.browser_download_url ?? null,
    assetName: asset?.name ?? null,
  }

  return {
    release,
    newer: isRemoteNewer(localVersion, version),
  }
}

/** Dispara la descarga del .exe (o abre la página del release). */
export function startUpdateDownload(release: LatestRelease): void {
  if (release.downloadUrl) {
    const a = document.createElement('a')
    a.href = release.downloadUrl
    a.rel = 'noopener noreferrer'
    a.download = release.assetName ?? `LecturaFiel-v${release.version}.exe`
    document.body.appendChild(a)
    a.click()
    a.remove()
    return
  }
  window.open(release.htmlUrl, '_blank', 'noopener,noreferrer')
}
