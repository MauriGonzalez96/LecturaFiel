/** Hosts HTTPS permitidos para descargar el instalador. */
const ALLOWED_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'github-releases.githubusercontent.com',
])

/**
 * Valida URL de update antes de descargar/ejecutar.
 * Rechaza http, hosts ajenos, path traversal y no-.exe.
 */
export function isAllowedUpdateUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  const host = parsed.hostname.toLowerCase()
  if (
    !ALLOWED_HOSTS.has(host) &&
    !host.endsWith('.githubusercontent.com')
  ) {
    return false
  }
  const path = parsed.pathname.toLowerCase()
  if (!path.endsWith('.exe')) return false
  if (path.includes('..')) return false
  // En github.com solo assets de Releases.
  if (host === 'github.com' && !path.includes('/releases/download/')) {
    return false
  }
  return true
}

/** Nombre de archivo seguro para el instalador en TEMP. */
export function safeInstallerFileName(url: string): string {
  try {
    const parsed = new URL(url)
    const last = parsed.pathname.split('/').filter(Boolean).pop() ?? ''
    const cleaned = last.replace(/[^A-Za-z0-9._-]/g, '')
    if (
      cleaned.toLowerCase().endsWith('.exe') &&
      cleaned.length > 4 &&
      !cleaned.includes('..')
    ) {
      return cleaned
    }
  } catch {
    /* ignore */
  }
  return 'Lektor-Setup.exe'
}
