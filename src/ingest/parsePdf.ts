import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { groupPdfPages } from './groupPdfChapters'
import type { ParsedBook } from './types'
import { cleanupExtractedText } from './textCleanup'

GlobalWorkerOptions.workerSrc = pdfWorker

const CHAPTER_HEADING =
  /(?:^|\n)\s*(?:capítulo|capitulo|chapter|parte)\s+([ivxlcdm\d]+)(?:[.\s:—-]+)([^\n]{0,90})/i

/**
 * Extrae texto página a página, detecta capítulos literarios y agrupa
 * en unidades de lectura (no una entrada por página en el selector).
 */
export async function parsePdf(file: File): Promise<ParsedBook> {
  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocument({ data }).promise

  const pageTexts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const line = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pageTexts.push(cleanupExtractedText(line))
  }

  const hasText = pageTexts.some((p) => p.length > 0)
  if (!hasText) {
    throw new Error(
      'Este PDF no tiene texto seleccionable (puede ser solo imágenes/escaneado).',
    )
  }

  const baseTitle = file.name.replace(/\.pdf$/i, '')
  let title = baseTitle
  try {
    const meta = await pdf.getMetadata()
    const metaTitle = (meta.info as { Title?: string } | undefined)?.Title
    if (typeof metaTitle === 'string' && metaTitle.trim()) {
      title = metaTitle.trim()
    }
  } catch {
    /* sin metadatos */
  }

  let literaryChapter = 0
  let chapterLabel = 'Inicio / preliminares'

  const drafts = pageTexts.map((text, i) => {
    const page = i + 1
    const match = text.match(CHAPTER_HEADING)
    if (match) {
      literaryChapter += 1
      const num = match[1]?.trim() ?? String(literaryChapter)
      const rest = (match[2] ?? '').trim().replace(/\s+/g, ' ')
      chapterLabel = rest
        ? `Capítulo ${num}: ${rest}`
        : `Capítulo ${num}`
    }
    return {
      page,
      text,
      chapterLabel,
      literaryChapter,
    }
  })

  return {
    title,
    sourceName: file.name,
    format: 'pdf',
    chapters: groupPdfPages(drafts),
  }
}
