/**
 * Prueba en vivo contra Gemini + texto de Camino de servidumbre.
 * Requiere: GEMINI_API_KEY y tmp/hayek-pages.json (generado al extraer el PDF).
 *
 *   $env:GEMINI_API_KEY="..."; npm test -- --run src/ai/liveHayek.integration.test.ts
 */
import fs from 'node:fs'
import path from 'node:path'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { groupPdfPagesDetailed } from '../ingest/groupPdfChapters'
import { cleanupExtractedText } from '../ingest/textCleanup'
import type { BookChapter } from '../ingest/types'

const KEY = process.env.GEMINI_API_KEY?.trim() ?? ''
const PAGES_PATH = path.resolve('tmp/hayek-pages.json')
const hasPages = fs.existsSync(PAGES_PATH)

const memory = new Map<string, unknown>()

vi.mock('./summaryStorage', () => ({
  loadChapterSummary: async (
    bookId: string,
    chapterIndex: number,
    hash: string,
  ) => memory.get(`c:${bookId}:${chapterIndex}:${hash}`) ?? null,
  saveChapterSummary: async (summary: {
    bookId: string
    chapterIndex: number
    textHash: string
  }) => {
    memory.set(
      `c:${summary.bookId}:${summary.chapterIndex}:${summary.textHash}`,
      summary,
    )
  },
  loadProgressSummary: async (bookId: string, upTo: number, hash: string) =>
    memory.get(`p:${bookId}:${upTo}:${hash}`) ?? null,
  saveProgressSummary: async (summary: {
    bookId: string
    upToIndex: number
    textHash: string
  }) => {
    memory.set(
      `p:${summary.bookId}:${summary.upToIndex}:${summary.textHash}`,
      summary,
    )
  },
}))

const CHAPTER_HEADING =
  /(?:^|\n)\s*(?:capítulo|capitulo|chapter|parte|libro|book|sección|seccion)\s+([ivxlcdm\d]+)(?:[.\s:—-]+)([^\n]{0,90})/i
const NUMBERED_HEADING =
  /(?:^|\n)\s*([IVXLCDM]{1,8}|\d{1,3})\.\s+([A-ZÁÉÍÓÚÜÑ][^\n]{2,90})/

function buildHayekChapters(): BookChapter[] {
  const raw = JSON.parse(fs.readFileSync(PAGES_PATH, 'utf8')) as {
    pages: string[]
  }
  let literaryChapter = 0
  let chapterLabel = 'Inicio / preliminares'
  const drafts = raw.pages.map((text, i) => {
    const cleaned = cleanupExtractedText(text)
    const classic = cleaned.match(CHAPTER_HEADING)
    const numbered = classic ? null : cleaned.match(NUMBERED_HEADING)
    const match = classic ?? numbered
    if (match) {
      literaryChapter += 1
      if (classic) {
        const num = classic[1]?.trim() ?? String(literaryChapter)
        const rest = (classic[2] ?? '').trim().replace(/\s+/g, ' ')
        chapterLabel = rest ? `Capítulo ${num}: ${rest}` : `Capítulo ${num}`
      } else if (numbered) {
        const num = numbered[1]?.trim() ?? String(literaryChapter)
        const rest = (numbered[2] ?? '').trim().replace(/\s+/g, ' ')
        chapterLabel = rest ? `${num}. ${rest}` : `Sección ${num}`
      }
    }
    return {
      page: i + 1,
      text: cleaned,
      chapterLabel,
      literaryChapter,
    }
  })
  return groupPdfPagesDetailed(drafts).chapters
}

describe.runIf(Boolean(KEY) && hasPages)('live Hayek × Gemini', () => {
  let chapters: BookChapter[] = []

  beforeAll(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    })
    localStorage.setItem(
      'lectura-fiel:ai-config',
      JSON.stringify({
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey: KEY,
        model: 'gemini-3-flash-preview',
      }),
    )
    chapters = buildHayekChapters()
    memory.clear()
  })

  it('ingesta el PDF en bloques de lectura', () => {
    expect(chapters.length).toBeGreaterThan(5)
    const words = chapters.reduce(
      (n, c) => n + (c.text.trim() ? c.text.trim().split(/\s+/).length : 0),
      0,
    )
    expect(words).toBeGreaterThan(20_000)
    // eslint-disable-next-line no-console
    console.log(
      `Hayek: ${chapters.length} bloques, ~${words.toLocaleString('es')} palabras`,
    )
  })

  it(
    'detectChaptersWithAi propone cortes literarios',
    async () => {
      const { detectChaptersWithAi } = await import('./detectChapters')
      const result = await detectChaptersWithAi({
        bookTitle: 'Camino de servidumbre',
        chapters,
      })
      expect(result.chapters.length).toBeGreaterThan(3)
      expect(result.chapters.length).toBeLessThan(chapters.length)
      expect(result.chapters[0]!.text.length).toBeGreaterThan(100)
      // eslint-disable-next-line no-console
      console.log(
        'Propuesta IA:',
        result.chapters.map((c, i) => `${i + 1}. ${c.title}`).join(' | '),
      )
      chapters = result.chapters
    },
    240_000,
  )

  it(
    'summarizeChapter resume un capítulo real',
    async () => {
      const { summarizeChapter } = await import('./summarizeChapter')
      const target =
        chapters.find((c) => /camino abandonado|prólogo|prefacio|intro/i.test(c.title)) ??
        chapters.find((c) => c.text.split(/\s+/).length > 800) ??
        chapters[Math.min(2, chapters.length - 1)]!

      const result = await summarizeChapter({
        bookId: 'hayek-live',
        chapterIndex: 0,
        title: target.title,
        text: target.text.slice(0, 14_000),
        force: true,
      })
      expect(result.summary.trim().length).toBeGreaterThan(120)
      expect(result.summary.toLowerCase()).not.toMatch(/```/)
      // eslint-disable-next-line no-console
      console.log(
        `Resumen «${target.title}» (${result.summary.length} chars):\n${result.summary.slice(0, 400)}…`,
      )
    },
    240_000,
  )

  it(
    'summarizeProgressSoFar arma arco con 2 resúmenes',
    async () => {
      const { summarizeChapter } = await import('./summarizeChapter')
      const { summarizeProgressSoFar } = await import('./summarizeProgress')

      const a = chapters[0]!
      const b = chapters[Math.min(1, chapters.length - 1)]!
      const s0 = await summarizeChapter({
        bookId: 'hayek-live',
        chapterIndex: 0,
        title: a.title,
        text: a.text.slice(0, 10_000),
        force: true,
      })
      const s1 = await summarizeChapter({
        bookId: 'hayek-live',
        chapterIndex: 1,
        title: b.title,
        text: b.text.slice(0, 10_000),
        force: true,
      })
      const progress = await summarizeProgressSoFar({
        bookId: 'hayek-live',
        bookTitle: 'Camino de servidumbre',
        upToIndex: 1,
        chapterSummaries: [s0, s1],
        force: true,
      })
      expect(progress.summary.trim().length).toBeGreaterThan(80)
      // eslint-disable-next-line no-console
      console.log(`Progreso: ${progress.summary.slice(0, 280)}…`)
    },
    300_000,
  )

  it('chatClient aguanta modelo retirado vía fallback', async () => {
    localStorage.setItem(
      'lectura-fiel:ai-config',
      JSON.stringify({
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
        apiKey: KEY,
        model: 'gemini-2.0-flash',
      }),
    )
    const { chatCompletion } = await import('./chatClient')
    const { loadAiConfig } = await import('./config')
    const text = await chatCompletion(
      [{ role: 'user', content: 'Respondé solo la palabra OK' }],
      { temperature: 0, maxTokens: 256 },
    )
    expect(text.toLowerCase()).toMatch(/ok/)
    expect(loadAiConfig().model).not.toBe('gemini-2.0-flash')
  }, 120_000)
})

describe.runIf(!KEY || !hasPages)('live Hayek × Gemini (skip)', () => {
  it('omite sin GEMINI_API_KEY o sin tmp/hayek-pages.json', () => {
    expect(true).toBe(true)
  })
})
