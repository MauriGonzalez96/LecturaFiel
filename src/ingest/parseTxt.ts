import type { ParsedBook } from './types'
import { cleanupExtractedText, detectFormat, splitIntoChapters } from './textCleanup'

export async function parsePlainText(file: File): Promise<ParsedBook> {
  const raw = await file.text()
  const text = cleanupExtractedText(raw)
  const baseTitle = file.name.replace(/\.[^.]+$/, '')
  const chapters = splitIntoChapters(text, baseTitle)

  return {
    title: baseTitle,
    sourceName: file.name,
    format: detectFormat(file.name),
    chapters,
  }
}
