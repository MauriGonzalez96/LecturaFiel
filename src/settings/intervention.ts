/**
 * Nivel de intervención léxica (configuración del usuario).
 * Afecta qué candidatas entran al pipeline de reemplazo / glosario.
 */
export type InterventionMode = 'minimo' | 'medio' | 'completo'

export interface InterventionOptions {
  /** Nivel mínimo del léxico semilla (2 o 3). */
  minLevel: 2 | 3
  /** Incluir palabras raras fuera del semilla (solo glosario). */
  includeRarity: boolean
}

export const DEFAULT_INTERVENTION_MODE: InterventionMode = 'completo'

export const INTERVENTION_OPTIONS: {
  id: InterventionMode
  label: string
  hint: string
}[] = [
  {
    id: 'minimo',
    label: 'Mínimo — solo arcaísmos (N3)',
    hint: 'Máxima fidelidad: solo palabras muy difíciles o arcaicas.',
  },
  {
    id: 'medio',
    label: 'Medio — poco frecuentes (N2–N3)',
    hint: 'Léxico semilla N2 y N3, sin detección automática por rareza.',
  },
  {
    id: 'completo',
    label: 'Completo — N2–N3 + rareza',
    hint: 'Recomendado: incluye también palabras raras fuera del léxico.',
  },
]

export function interventionOptions(mode: InterventionMode): InterventionOptions {
  switch (mode) {
    case 'minimo':
      return { minLevel: 3, includeRarity: false }
    case 'medio':
      return { minLevel: 2, includeRarity: false }
    case 'completo':
    default:
      return { minLevel: 2, includeRarity: true }
  }
}

const STORAGE_KEY = 'lectura-fiel:intervention-mode'

export function readInterventionMode(): InterventionMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'minimo' || raw === 'medio' || raw === 'completo') return raw
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
