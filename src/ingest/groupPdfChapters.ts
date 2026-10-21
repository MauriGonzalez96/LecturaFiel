import type { BookChapter } from './types'

/** Si no hay encabezados literarios, agrupar de a N páginas. */
export const PDF_PAGES_PER_CHUNK = 8

type PageDraft = {
  page: number
  text: string
  chapterLabel: string
  literaryChapter: number
}

/**
 * Agrupa páginas PDF en unidades de lectura:
 * - Con encabezados «Capítulo N»: un ítem por capítulo literario (rango de páginas).
 * - Sin encabezados: bloques de PDF_PAGES_PER_CHUNK páginas.
 */
export function groupPdfPages(pages: PageDraft[]): BookChapter[] {
  if (pages.length === 0) return []

  const hasLiterary = pages.some((p) => p.literaryChapter > 0)
  if (hasLiterary) {
    return groupByLiterary(pages)
  }
  return groupByPageChunks(pages, PDF_PAGES_PER_CHUNK)
}

function groupByLiterary(pages: PageDraft[]): BookChapter[] {
  const groups: BookChapter[] = []
  let number = 0

  for (const page of pages) {
    const last = groups[groups.length - 1]
    const same =
      last &&
      last.literaryChapter === (page.literaryChapter || undefined) &&
      last.chapterLabel === page.chapterLabel

    if (same && last) {
      last.text = joinPageText(last.text, page.text, page.page)
      last.pageTo = page.page
      last.title = sectionTitle(last)
      continue
    }

    number += 1
    const chapter: BookChapter = {
      number,
      title: '',
      text: page.text || `(Página ${page.page} sin texto extraíble)`,
      pageFrom: page.page,
      pageTo: page.page,
      chapterLabel: page.chapterLabel,
      literaryChapter: page.literaryChapter || undefined,
    }
    chapter.title = sectionTitle(chapter)
    groups.push(chapter)
  }

  return groups
}

function groupByPageChunks(
  pages: PageDraft[],
  chunkSize: number,
): BookChapter[] {
  const groups: BookChapter[] = []
  for (let i = 0; i < pages.length; i += chunkSize) {
    const slice = pages.slice(i, i + chunkSize)
    const from = slice[0]!.page
    const to = slice[slice.length - 1]!.page
    const text = slice
      .map((p) => p.text || `(Página ${p.page} sin texto extraíble)`)
      .join('\n\n')
    const number = groups.length + 1
    groups.push({
      number,
      title: from === to ? `Página ${from}` : `Páginas ${from}–${to}`,
      text,
      pageFrom: from,
      pageTo: to,
      chapterLabel: from === to ? `Página ${from}` : `Páginas ${from}–${to}`,
    })
  }
  return groups
}

function joinPageText(prev: string, next: string, page: number): string {
  const piece = next || `(Página ${page} sin texto extraíble)`
  if (!prev.trim()) return piece
  return `${prev}\n\n${piece}`
}

function sectionTitle(ch: BookChapter): string {
  const from = ch.pageFrom ?? ch.number
  const to = ch.pageTo ?? from
  const pages = from === to ? `pág. ${from}` : `págs. ${from}–${to}`
  if (ch.chapterLabel && ch.chapterLabel !== 'Inicio / preliminares') {
    return `${ch.chapterLabel} (${pages})`
  }
  if (ch.literaryChapter) {
    return `Capítulo ${ch.literaryChapter} (${pages})`
  }
  return from === to ? `Página ${from}` : `Páginas ${from}–${to}`
}
