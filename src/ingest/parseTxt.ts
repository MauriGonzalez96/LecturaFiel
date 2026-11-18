import type { ParsedBook } from './types'
import { assessSplitConfidence } from './splitConfidence'
import {
  cleanupExtractedText,
  detectFormat,
  splitIntoChaptersDetailed,
} from './textCleanup'

export async function parsePlainText(file: File): Promise<ParsedBook> {
  const raw = await file.text()
  const text = cleanupExtractedText(raw)
  const baseTitle = file.name.replace(/\.[^.]+$/, '')
  const format = detectFormat(file.name)
  const { chapters, kind } = splitIntoChaptersDetailed(text, baseTitle)

  return {
    title: baseTitle,
    sourceName: file.name,
    format,
    chapters,
    splitConfidence: assessSplitConfidence({
      format,
      chapters,
      textSplitKind: kind,
    }),
  }
}
