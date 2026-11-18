import { textHash } from './hash'
import { listSummariesForBook } from './summaryStorage'
import type { ChapterSummary } from './types'

export type BookSummaryMapEntry = {
  index: number
  title: string
  ready: boolean
  excerpt: string
  summary: string | null
  createdAt: string | null
  model: string | null
}

export type BookSummaryChapterInput = {
  index: number
  title: string
  text: string
}

/** Empareja capítulos actuales con resúmenes válidos (mismo textHash). */
export async function buildBookSummaryMap(
  bookId: string,
  chapters: BookSummaryChapterInput[],
): Promise<BookSummaryMapEntry[]> {
  const stored = await listSummariesForBook(bookId)
  const byIndex = new Map<number, ChapterSummary>()
  for (const s of stored) {
    const prev = byIndex.get(s.chapterIndex)
    if (!prev || prev.createdAt < s.createdAt) {
      byIndex.set(s.chapterIndex, s)
    }
  }

  return chapters.map((ch) => {
    const hash = textHash((ch.text || '').replace(/\s+/g, ' ').trim())
    const hit = byIndex.get(ch.index)
    const ready = Boolean(hit && hit.textHash === hash && hit.summary.trim())
    const summary = ready ? hit!.summary.trim() : null
    return {
      index: ch.index,
      title: ch.title || `Capítulo ${ch.index + 1}`,
      ready,
      excerpt: summary ? excerptSummary(summary) : '',
      summary,
      createdAt: ready ? hit!.createdAt : null,
      model: ready ? hit!.model : null,
    }
  })
}

export function buildBookSummariesMarkdown(opts: {
  bookTitle: string
  entries: BookSummaryMapEntry[]
  onlyReady?: boolean
}): string {
  const rows = opts.onlyReady === false
    ? opts.entries
    : opts.entries.filter((e) => e.ready && e.summary)

  const lines: string[] = [
    `# ${opts.bookTitle.trim() || 'Libro'}`,
    '',
    `> Resúmenes de idea fundamental · Lectura Fiel`,
    '',
  ]

  if (rows.length === 0) {
    lines.push('_Todavía no hay resúmenes guardados para este libro._', '')
    return lines.join('\n')
  }

  for (const e of rows) {
    lines.push(`## ${e.index + 1}. ${e.title}`)
    lines.push('')
    if (e.model || e.createdAt) {
      const meta = [
        e.model,
        e.createdAt
          ? new Date(e.createdAt).toLocaleString(undefined, {
              dateStyle: 'short',
              timeStyle: 'short',
            })
          : null,
      ]
        .filter(Boolean)
        .join(' · ')
      lines.push(`_${meta}_`, '')
    }
    lines.push(e.summary!.trim(), '', '')
  }

  return lines.join('\n').trimEnd() + '\n'
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = 'text/markdown;charset=utf-8',
): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadBookSummariesMarkdown(opts: {
  bookTitle: string
  entries: BookSummaryMapEntry[]
}): void {
  const md = buildBookSummariesMarkdown(opts)
  const slug =
    opts.bookTitle
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'libro'
  downloadTextFile(`lectura-fiel-resumenes-${slug}.md`, md)
}

function excerptSummary(summary: string, max = 180): string {
  const flat = summary.replace(/\s+/g, ' ').trim()
  if (flat.length <= max) return flat
  const cut = flat.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`
}
