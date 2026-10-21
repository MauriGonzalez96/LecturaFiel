import JSZip from 'jszip'
import type { ParsedBook } from './types'
import { cleanupExtractedText, stripHtml } from './textCleanup'

/**
 * Parser EPUB mínimo (EPUB 2/3):
 * container.xml → OPF → spine → XHTML → texto.
 */
export async function parseEpub(file: File): Promise<ParsedBook> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const containerXml = await readZipText(zip, 'META-INF/container.xml')
  if (!containerXml) {
    throw new Error('EPUB inválido: falta META-INF/container.xml')
  }

  const rootfile = firstAttr(containerXml, 'rootfile', 'full-path')
  if (!rootfile) throw new Error('EPUB inválido: no se encontró el OPF')

  const opfPath = rootfile
  const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1) : ''
  const opfXml = await readZipText(zip, opfPath)
  if (!opfXml) throw new Error('EPUB inválido: no se pudo leer el OPF')

  const bookTitle =
    textBetween(opfXml, /<dc:title[^>]*>/i, /<\/dc:title>/i) ??
    file.name.replace(/\.epub$/i, '')

  const manifest = buildManifest(opfXml)
  const spineIds = [...opfXml.matchAll(/<itemref[^>]*idref=["']([^"']+)["']/gi)].map(
    (m) => m[1]!,
  )

  const chapters: ParsedBook['chapters'] = []
  let n = 0

  for (const id of spineIds) {
    const href = manifest.get(id)
    if (!href) continue
    if (/\.(css|jpg|jpeg|png|gif|svg|ttf|otf|woff2?|js)$/i.test(href)) continue

    const fullPath = resolvePath(opfDir, href)
    const html = await readZipText(zip, fullPath)
    if (!html) continue

    const text = stripHtml(html)
    if (text.length < 80) continue

    n += 1
    const heading = text.split('\n').find((l) => l.trim().length > 0)?.slice(0, 80)
    chapters.push({
      number: n,
      title: heading ? `Capítulo ${n}: ${heading}` : `Capítulo ${n}`,
      text,
    })
  }

  if (chapters.length === 0) {
    throw new Error('No se pudo extraer texto del EPUB')
  }

  // Títulos más cortos si el primer renglón es enorme
  for (const ch of chapters) {
    if (ch.title.length > 72) {
      ch.title = `Capítulo ${ch.number}`
    }
  }

  return {
    title: cleanupExtractedText(bookTitle),
    sourceName: file.name,
    format: 'epub',
    chapters,
  }
}

function buildManifest(opfXml: string): Map<string, string> {
  const map = new Map<string, string>()
  const re = /<item\b[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(opfXml)) !== null) {
    const tag = m[0]
    const id = attr(tag, 'id')
    const href = attr(tag, 'href')
    if (id && href) map.set(id, href)
  }
  return map
}

async function readZipText(zip: JSZip, path: string): Promise<string | null> {
  const normalized = path.replace(/^\/+/, '')
  let entry = zip.file(normalized)
  if (!entry) {
    // Algunos EPUB usan mayúsculas distintas
    const found = Object.keys(zip.files).find(
      (k) => k.replace(/\\/g, '/').toLowerCase() === normalized.toLowerCase(),
    )
    if (found) entry = zip.file(found)
  }
  if (!entry) return null
  return entry.async('text')
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}=["']([^"']+)["']`, 'i'))
  return m?.[1] ?? null
}

function firstAttr(xml: string, tag: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*>`, 'i'))
  return m ? attr(m[0], name) : null
}

function textBetween(xml: string, open: RegExp, close: RegExp): string | null {
  const o = open.exec(xml)
  if (!o || o.index === undefined) return null
  const from = o.index + o[0].length
  const rest = xml.slice(from)
  const c = close.exec(rest)
  if (!c || c.index === undefined) return null
  return rest.slice(0, c.index).replace(/<[^>]+>/g, '').trim()
}

function resolvePath(baseDir: string, href: string): string {
  const raw = `${baseDir}${href}`.replace(/\\/g, '/')
  const parts: string[] = []
  for (const p of raw.split('/')) {
    if (!p || p === '.') continue
    if (p === '..') parts.pop()
    else parts.push(p)
  }
  return parts.join('/')
}
