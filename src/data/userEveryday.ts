import { stripDiacritics } from './commonSpanish'

const STORAGE_KEY = 'lectura-fiel:user-everyday'

type Listener = () => void

let cache: Set<string> | null = null
const listeners = new Set<Listener>()

function normalizeKey(word: string): string {
  return stripDiacritics(word)
    .toLowerCase()
    .replace(/^[«»„"'"‘’]+|[«»„"'"‘’.,;:!?…]+$/g, '')
    .trim()
}

function readRaw(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((x): x is string => typeof x === 'string')
      .map(normalizeKey)
      .filter(Boolean)
  } catch {
    return []
  }
}

function writeRaw(words: string[]): void {
  const unique = [...new Set(words.map(normalizeKey).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, 'es'),
  )
  cache = new Set(unique)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unique))
  } catch {
    /* ignore quota */
  }
  for (const l of listeners) l()
}

function ensureCache(): Set<string> {
  if (!cache) cache = new Set(readRaw())
  return cache
}

/** Palabras que el usuario marcó como cotidianas (no tocar). */
export function listUserEveryday(): string[] {
  return [...ensureCache()].sort((a, b) => a.localeCompare(b, 'es'))
}

export function isUserEveryday(word: string): boolean {
  const key = normalizeKey(word)
  if (!key) return false
  return ensureCache().has(key)
}

/** Agrega una o varias palabras. Devuelve cuántas eran nuevas. */
export function addUserEveryday(...words: string[]): number {
  const set = ensureCache()
  let added = 0
  const next = [...set]
  for (const w of words) {
    const key = normalizeKey(w)
    if (!key || key.length < 2) continue
    if (set.has(key)) continue
    set.add(key)
    next.push(key)
    added += 1
  }
  if (added > 0) writeRaw(next)
  return added
}

export function removeUserEveryday(word: string): boolean {
  const key = normalizeKey(word)
  const set = ensureCache()
  if (!set.has(key)) return false
  set.delete(key)
  writeRaw([...set])
  return true
}

export function clearUserEveryday(): void {
  writeRaw([])
}

export function subscribeUserEveryday(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
