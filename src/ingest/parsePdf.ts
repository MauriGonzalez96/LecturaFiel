import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { groupPdfPagesDetailed } from './groupPdfChapters'
import { assessSplitConfidence } from './splitConfidence'
import type { ParsedBook } from './types'
import { cleanupExtractedText } from './textCleanup'

GlobalWorkerOptions.workerSrc = pdfWorker

/** Encabezados literarios frecuentes en PDFs en español/inglés. */
const CHAPTER_HEADING =
  /(?:^|\n)\s*(?:capítulo|capitulo|chapter|parte|libro|book|sección|seccion)\s+([ivxlcdm\d]+)(?:[.\s:—-]+)([^\n]{0,90})/i

/** Líneas tipo «I. EL PROBLEMA» o «1. Introducción» al inicio de página. */
const NUMBERED_HEADING =
  /(?:^|\n)\s*([IVXLCDM]{1,8}|\d{1,3})\.\s+([A-ZÁÉÍÓÚÜÑ][^\n]{2,90})/

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
    const classic = text.match(CHAPTER_HEADING)
    const numbered = classic ? null : text.match(NUMBERED_HEADING)
    const match = classic ?? numbered
    if (match) {
      literaryChapter += 1
      if (classic) {
        const num = classic[1]?.trim() ?? String(literaryChapter)
        const rest = (classic[2] ?? '').trim().replace(/\s+/g, ' ')
        chapterLabel = rest
          ? `Capítulo ${num}: ${rest}`
          : `Capítulo ${num}`
      } else if (numbered) {
        const num = numbered[1]?.trim() ?? String(literaryChapter)
        const rest = (numbered[2] ?? '').trim().replace(/\s+/g, ' ')
        chapterLabel = rest ? `${num}. ${rest}` : `Sección ${num}`
      }
    }
    return {
      page,
      text,
      chapterLabel,
      literaryChapter,
    }
  })

  const { chapters, usedPageChunks } = groupPdfPagesDetailed(drafts)

  return {
    title,
    sourceName: file.name,
    format: 'pdf',
    chapters,
    splitConfidence: assessSplitConfidence({
      format: 'pdf',
      chapters,
      usedPageChunks,
    }),
  }
}
