import type { BookChapter } from './types'

export function wordCount(text: string): number {
  const t = text.trim()
  return t ? t.split(/\s+/).filter(Boolean).length : 0
}

export function renumberChapters(chapters: BookChapter[]): BookChapter[] {
  return chapters.map((c, i) => ({
    ...c,
    number: i + 1,
  }))
}

export function renameChapter(
  chapters: BookChapter[],
  index: number,
  title: string,
): BookChapter[] {
  if (index < 0 || index >= chapters.length) return chapters
  const next = title.trim()
  if (!next) return chapters
  return renumberChapters(
    chapters.map((c, i) =>
      i === index
        ? {
            ...c,
            title: next,
            chapterLabel: next,
          }
        : c,
    ),
  )
}

/** Une el capítulo `index` con el siguiente. */
export function mergeWithNext(
  chapters: BookChapter[],
  index: number,
): BookChapter[] {
  if (index < 0 || index >= chapters.length - 1) return chapters
  const a = chapters[index]!
  const b = chapters[index + 1]!
  const merged: BookChapter = {
    number: a.number,
    title: a.title,
    text: [a.text.trim(), b.text.trim()].filter(Boolean).join('\n\n'),
    pageFrom: minOpt(a.pageFrom, b.pageFrom),
    pageTo: maxOpt(a.pageTo ?? a.pageFrom, b.pageTo ?? b.pageFrom),
    chapterLabel: a.chapterLabel ?? a.title,
    literaryChapter: a.literaryChapter,
  }
  return renumberChapters([
    ...chapters.slice(0, index),
    merged,
    ...chapters.slice(index + 2),
  ])
}

/**
 * Parte el capítulo en `index` en el offset de carácter.
 * Ajusta el corte al fin de párrafo/oración cercano si es posible.
 */
export function splitChapterAt(
  chapters: BookChapter[],
  index: number,
  rawAt: number,
): BookChapter[] {
  if (index < 0 || index >= chapters.length) return chapters
  const ch = chapters[index]!
  const text = ch.text
  if (text.length < 80) return chapters

  const at = snapSplitOffset(text, rawAt)
  if (at < 40 || at > text.length - 40) return chapters

  const left = text.slice(0, at).trim()
  const right = text.slice(at).trim()
  if (left.length < 40 || right.length < 40) return chapters

  const a: BookChapter = {
    ...ch,
    title: ch.title,
    text: left,
    pageTo: ch.pageFrom != null ? ch.pageFrom : ch.pageTo,
    chapterLabel: ch.chapterLabel ?? ch.title,
  }
  const b: BookChapter = {
    number: ch.number + 1,
    title: `${stripPartSuffix(ch.title)} (continuación)`,
    text: right,
    pageFrom: ch.pageTo ?? ch.pageFrom,
    pageTo: ch.pageTo,
    chapterLabel: `${stripPartSuffix(ch.chapterLabel ?? ch.title)} (continuación)`,
  }

  return renumberChapters([
    ...chapters.slice(0, index),
    a,
    b,
    ...chapters.slice(index + 1),
  ])
}

export function restoreSourceChapters(
  current: BookChapter[],
  source: BookChapter[] | undefined,
): BookChapter[] {
  if (!source || source.length === 0) return current
  return renumberChapters(source.map((c) => ({ ...c })))
}

export function cloneChapters(chapters: BookChapter[]): BookChapter[] {
  return chapters.map((c) => ({ ...c }))
}

function snapSplitOffset(text: string, rawAt: number): number {
  const at = Math.max(0, Math.min(text.length, Math.floor(rawAt)))
  const window = 120
  const from = Math.max(40, at - window)
  const to = Math.min(text.length - 40, at + window)
  const slice = text.slice(from, to)

  const para = slice.lastIndexOf('\n\n')
  if (para >= 0) return from + para + 2

  const markers = ['. ', '? ', '! ', '.\n', '?\n', '!\n']
  let best = -1
  for (const m of markers) {
    const i = slice.lastIndexOf(m)
    if (i > best) best = i + m.length
  }
  if (best >= 0) return from + best
  return at
}

function stripPartSuffix(title: string): string {
  return title.replace(/\s*\(continuación\)\s*$/i, '').trim() || title
}

function minOpt(a?: number, b?: number): number | undefined {
  if (a == null) return b
  if (b == null) return a
  return Math.min(a, b)
}

function maxOpt(a?: number, b?: number): number | undefined {
  if (a == null) return b
  if (b == null) return a
  return Math.max(a, b)
}
