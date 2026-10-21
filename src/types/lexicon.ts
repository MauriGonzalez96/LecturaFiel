/** Nivel de intervención del umbral alto (sección 5 de la especificación). */
export type DifficultyLevel = 0 | 1 | 2 | 3

/**
 * 0 — habitual: no hacer nada
 * 1 — literario/formal vigente: conservar
 * 2 — poco frecuente: evaluar según contexto
 * 3 — arcaico / muy culto / difícil: considerar sustitución
 */
export type SubstitutionDecision =
  | 'preserve'
  | 'substitute'
  | 'glossary_only'
  | 'evaluate'

export interface LexiconEntry {
  /** Forma canónica en minúsculas (lema o forma típica). */
  lemma: string
  /** Variantes flexivas / ortográficas a detectar. */
  forms: string[]
  level: DifficultyLevel
  /** Definición para el glosario. */
  definition: string
  /**
   * Sustitución preferida cuando conserve el sentido.
   * Si falta o es null, no se sustituye: solo glosario.
   */
  preferredSubstitute?: string | null
  /**
   * Forma aún más simple (modo 4 — Simple).
   * Si falta, el motor sintetiza desde preferredSubstitute o la definición.
   */
  simpleSubstitute?: string | null
  /** Notas de política (p. ej. "conservar matices"). */
  notes?: string
  /** Decisión por defecto tras evaluación contextual. */
  defaultDecision: SubstitutionDecision
}

export interface TextToken {
  raw: string
  normalized: string
  isWord: boolean
  start: number
  end: number
}

export interface CandidateMatch {
  tokenIndex: number
  token: TextToken
  entry: LexiconEntry
}

export type GlossaryKind = 'substituted' | 'preserved_difficult'

export interface GlossaryItem {
  id: string
  word: string
  lemma: string
  definition: string
  kind: GlossaryKind
  /** Expresión usada en el audio/texto adaptado (si hubo sustitución). */
  audioExpression?: string
  originalSentence: string
  chapter: number
  level: DifficultyLevel
}

export interface SubstitutionEvent {
  tokenIndex: number
  original: string
  replacement: string
  entry: LexiconEntry
}

export interface PipelineResult {
  originalText: string
  adaptedText: string
  chapter: number
  candidates: CandidateMatch[]
  substitutions: SubstitutionEvent[]
  glossary: GlossaryItem[]
  stats: {
    wordsAnalyzed: number
    candidatesFound: number
    /** Candidatas detectadas solo por rareza (fuera del léxico semilla). */
    rarityDetected: number
    substituted: number
    glossaryOnly: number
    preservedLiterary: number
  }
}

export interface DecisionCacheRecord {
  /** Clave de caché: lema o `lema|contextoPrevio`. */
  lemma: string
  decision: SubstitutionDecision
  substitute?: string | null
  /** Palabra previa usada para desambiguar (si aplica). */
  contextHint?: string
  updatedAt: string
}
