/**
 * Niveles de reemplazo (1 = más fiel, 4 = más simple).
 * El 4 prioriza las palabras más fáciles y sintetiza la idea.
 */
export type InterventionMode = '1' | '2' | '3' | '4'

export interface InterventionOptions {
  /** Nivel mínimo del léxico semilla a considerar. */
  minLevel: 1 | 2 | 3
  /** Incluir palabras raras fuera del semilla. */
  includeRarity: boolean
  /** Sustituir siempre que haya alternativa (menos glosario-only). */
  forceSubstitute: boolean
  /** Preferir la forma más fácil / sintetizar la idea. */
  preferSimplest: boolean
  /** Incluir literario/formal (N1) como candidatas. */
  includeLiterary: boolean
  /** Id del modo (caché de decisiones). */
  modeId: InterventionMode
}

export const DEFAULT_INTERVENTION_MODE: InterventionMode = '3'

export const INTERVENTION_OPTIONS: {
  id: InterventionMode
  label: string
  hint: string
}[] = [
  {
    id: '1',
    label: '1 — Fiel',
    hint: 'Solo arcaísmos del diccionario interno (N3). No escanea el capítulo entero.',
  },
  {
    id: '2',
    label: '2 — Suave',
    hint: 'Léxico N2–N3. Aún no busca palabras fuera del uso cotidiano.',
  },
  {
    id: '3',
    label: '3 — Claro (recomendado)',
    hint: 'Por capítulo: busca lo que no es cotidiano; reemplaza si hay sinónimo, si no → glosario.',
  },
  {
    id: '4',
    label: '4 — Simple',
    hint: 'Igual que Claro, con las palabras más fáciles posibles (incluye literario).',
  },
]

export function interventionOptions(mode: InterventionMode): InterventionOptions {
  switch (mode) {
    case '1':
      return {
        modeId: '1',
        minLevel: 3,
        includeRarity: false,
        forceSubstitute: false,
        preferSimplest: false,
        includeLiterary: false,
      }
    case '2':
      return {
        modeId: '2',
        minLevel: 2,
        includeRarity: false,
        forceSubstitute: false,
        preferSimplest: false,
        includeLiterary: false,
      }
    case '4':
      return {
        modeId: '4',
        minLevel: 1,
        includeRarity: true,
        forceSubstitute: true,
        preferSimplest: true,
        includeLiterary: true,
      }
    case '3':
    default:
      return {
        modeId: '3',
        minLevel: 2,
        includeRarity: true,
        forceSubstitute: false,
        preferSimplest: false,
        includeLiterary: false,
      }
  }
}

const STORAGE_KEY = 'lectura-fiel:intervention-mode'

function migrateLegacy(raw: string | null): InterventionMode | null {
  if (!raw) return null
  if (raw === '1' || raw === '2' || raw === '3' || raw === '4') return raw
  // Modos viejos
  if (raw === 'minimo') return '1'
  if (raw === 'medio') return '2'
  if (raw === 'completo') return '3'
  return null
}

export function readInterventionMode(): InterventionMode {
  try {
    const migrated = migrateLegacy(localStorage.getItem(STORAGE_KEY))
    if (migrated) return migrated
  } catch {
    /* ignore */
  }
  return DEFAULT_INTERVENTION_MODE
}

export function writeInterventionMode(mode: InterventionMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}
