import { attachBookIdentity } from '../library/bookId'
import type { IngestedBook, ParsedBook } from './types'
import { detectFormat } from './textCleanup'
import { parsePlainText } from './parseTxt'

const MAX_BYTES = 40 * 1024 * 1024 // 40 MB

export async function ingestFile(file: File): Promise<IngestedBook> {
  if (file.size > MAX_BYTES) {
    throw new Error('El archivo supera 40 MB. Probá con uno más liviano.')
  }

  const format = detectFormat(file.name)
  let book: ParsedBook

  switch (format) {
    case 'txt':
    case 'md':
      book = await parsePlainText(file)
      break
    case 'epub': {
      const { parseEpub } = await import('./parseEpub')
      book = await parseEpub(file)
      break
    }
    case 'pdf': {
      const { parsePdf } = await import('./parsePdf')
      book = await parsePdf(file)
      break
    }
    default:
      throw new Error(
        'Formato no soportado. Usá PDF, EPUB, TXT o Markdown (.md).',
      )
  }

  return attachBookIdentity(book, file)
}

export const ACCEPTED_EXTENSIONS = '.pdf,.epub,.txt,.md,.markdown'
export const ACCEPTED_LABEL = 'PDF, EPUB, TXT o Markdown'
