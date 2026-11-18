/** Huella corta y estable del texto (para invalidar resúmenes). */
export function textHash(text: string): string {
  const s = text.replace(/\s+/g, ' ').trim()
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16).padStart(8, '0') + `:${s.length}`
}
