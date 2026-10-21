import type { LexiconEntry } from '../types/lexicon'

/** Sinónimos todavía más cortos / cotidianos para el modo 4. */
const EASY_MAP: Record<string, string> = {
  'sin embargo': 'pero',
  'en la actualidad': 'hoy',
  'razonamiento engañoso': 'engaño',
  imperecedero: 'eterno',
  perverso: 'malo',
  descanso: 'descanso',
  'punto clave': 'lo importante',
  'amante del lujo': 'quien ama el lujo',
  insignificante: 'sin importancia',
  ofuscar: 'confundir',
  insulto: 'insulto',
  condenar: 'rechazar',
  'canto de victoria': 'canto de ganar',
  'canto fúnebre': 'canto triste',
  calumniador: 'mentiroso',
  dondequiera: 'en cualquier lado',
  '¡enhorabuena!': '¡qué bien!',
  hojaldre: 'masa',
  hornillo: 'fogón',
  bolsillo: 'bolsillo',
  bastante: 'bastante',
  aunque: 'aunque',
  hablar: 'hablar',
  juzgo: 'creo',
  ahora: 'ahora',
  mismo: 'mismo',
  desde: 'desde',
  preparar: 'preparar',
  así: 'así',
  'por eso': 'por eso',
}

/**
 * Elige el reemplazo según el modo.
 * En modo simple (preferSimplest): simpleSubstitute → mapa fácil → sintetizar definición.
 */
export function pickSubstitute(
  entry: LexiconEntry,
  preferSimplest: boolean,
  override?: string | null,
): string | null {
  if (override != null && override !== undefined) return override

  if (!preferSimplest) {
    return entry.preferredSubstitute ?? null
  }

  if (entry.simpleSubstitute?.trim()) {
    return entry.simpleSubstitute.trim()
  }

  const preferred = entry.preferredSubstitute?.trim()
  if (preferred) {
    const mapped = EASY_MAP[preferred.toLowerCase()]
    if (mapped) return mapped
    return shortenPhrase(preferred)
  }

  return synthesizeFromDefinition(entry.definition)
}

/** Acorta una frase a algo más cotidiano si es larga. */
export function shortenPhrase(phrase: string): string {
  const t = phrase.trim()
  if (t.length <= 16) return t
  const parts = t.split(/\s+/)
  if (parts.length >= 4) return parts.slice(0, 3).join(' ')
  return t
}

/**
 * Sintetiza una idea corta a partir de la definición del glosario.
 * Prioriza la primera idea clara (antes de ; o , explicativa).
 * Ej.: «Tristeza vaga, profunda…» → «tristeza»
 */
export function synthesizeFromDefinition(definition: string): string | null {
  let t = definition.trim()
  if (!t) return null

  t = (t.split(/[.;]/)[0] ?? t).trim()
  t = t.replace(
    /^(que|el|la|los|las|un|una|forma|persona|figura|uso)\s+/i,
    '',
  )
  // Si hay coma, quedarse con el núcleo (antes de matices)
  const comma = t.indexOf(',')
  if (comma > 3 && comma < 28) t = t.slice(0, comma).trim()

  t = t.replace(/\s+/g, ' ').trim()

  if (t.length < 2) return null
  if (t.length > 28) {
    const words = t.split(/\s+/)
    t = words.slice(0, Math.min(3, words.length)).join(' ')
  }

  return t.charAt(0).toLowerCase() + t.slice(1)
}
