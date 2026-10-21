/** Normaliza `v1.2.3` / `1.2.3-dev` → [1,2,3]. */
export function parseVersion(raw: string): number[] {
  const cleaned = raw.trim().replace(/^v/i, '').split('-')[0] ?? ''
  const parts = cleaned.split('.').map((p) => Number.parseInt(p, 10))
  while (parts.length < 3) parts.push(0)
  return parts.slice(0, 3).map((n) => (Number.isFinite(n) ? n : 0))
}

/**
 * @returns negativo si a < b, 0 si iguales, positivo si a > b
 */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

export function isRemoteNewer(local: string, remote: string): boolean {
  return compareVersions(remote, local) > 0
}
