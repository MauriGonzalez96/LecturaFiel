export interface AiConfig {
  /** Base URL OpenAI-compatible, ej. https://api.openai.com/v1 */
  baseUrl: string
  apiKey: string
  /** Modelo chat, ej. gpt-4o-mini, llama3.2, etc. */
  model: string
}

export interface ChapterSummary {
  bookId: string
  chapterIndex: number
  /** Huella del texto del capítulo (invalida caché si cambia). */
  textHash: string
  title: string
  summary: string
  model: string
  createdAt: string
}

/** Síntesis del arco del libro hasta un capítulo (Fase 3). */
export interface ProgressSummary {
  kind: 'progress'
  bookId: string
  upToIndex: number
  /** Huella de los resúmenes de capítulo usados. */
  textHash: string
  title: string
  summary: string
  model: string
  createdAt: string
}

export type SummaryStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured'
