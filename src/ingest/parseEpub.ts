import JSZip from 'jszip'
import { assessSplitConfidence } from './splitConfidence'
import type { ParsedBook } from './types'
import { cleanupExtractedText, stripHtml } from './textCleanup'

/**
 * Parser EPUB mínimo (EPUB 2/3):
 * container.xml → OPF → preferir nav/toc para títulos → spine → XHTML → texto.
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
  const opfDir = opfPath.includes('/')
    ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1)
    : ''
  const opfXml = await readZipText(zip, opfPath)
  if (!opfXml) throw new Error('EPUB inválido: no se pudo leer el OPF')

  const bookTitle =
    textBetween(opfXml, /<dc:title[^>]*>/i, /<\/dc:title>/i) ??
    file.name.replace(/\.epub$/i, '')

  const manifest = buildManifest(opfXml)
  const spineIds = [
    ...opfXml.matchAll(/<itemref[^>]*idref=["']([^"']+)["']/gi),
  ].map((m) => m[1]!)

  const tocTitles = await loadTocTitles(zip, opfDir, manifest, opfXml)

  const chapters: ParsedBook['chapters'] = []
  let n = 0
  let tocHits = 0

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
    const tocTitle = lookupTocTitle(tocTitles, href)
    if (tocTitle) tocHits += 1
    const heading = text.split('\n').find((l) => l.trim().length > 0)?.slice(0, 80)
    const title = tocTitle
      ? tocTitle.length > 72
        ? `${tocTitle.slice(0, 69)}…`
        : tocTitle
      : heading
        ? `Capítulo ${n}: ${heading}`
        : `Capítulo ${n}`

    chapters.push({
      number: n,
      title,
      text,
    })
  }

  if (chapters.length === 0) {
    throw new Error('No se pudo extraer texto del EPUB')
  }

  for (const ch of chapters) {
    if (ch.title.length > 72 && !tocTitles.size) {
      ch.title = `Capítulo ${ch.number}`
    }
  }

  let splitConfidence = assessSplitConfidence({
    format: 'epub',
    chapters,
  })
  // TOC con buenos títulos → subir confianza
  if (tocHits >= 2 && chapters.length >= 2) {
    splitConfidence = tocHits >= Math.min(chapters.length, 3) ? 'high' : 'medium'
  }

  return {
    title: cleanupExtractedText(bookTitle),
    sourceName: file.name,
    format: 'epub',
    chapters,
    splitConfidence,
  }
}

function buildManifest(opfXml: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const item of parseManifestItems(opfXml)) {
    map.set(item.id, item.href)
  }
  return map
}

function parseManifestItems(
  opfXml: string,
): { id: string; href: string; properties?: string }[] {
  const out: { id: string; href: string; properties?: string }[] = []
  const re = /<item\b[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(opfXml)) !== null) {
    const tag = m[0]
    const id = attr(tag, 'id')
    const href = attr(tag, 'href')
    const properties = attr(tag, 'properties') ?? undefined
    if (id && href) out.push({ id, href, properties })
  }
  return out
}

async function loadTocTitles(
  zip: JSZip,
  opfDir: string,
  manifest: Map<string, string>,
  opfXml: string,
): Promise<Map<string, string>> {
  const titles = new Map<string, string>()
  const items = parseManifestItems(opfXml)

  const navItem =
    items.find((i) => (i.properties ?? '').split(/\s+/).includes('nav')) ??
    null
  if (navItem) {
    const html = await readZipText(zip, resolvePath(opfDir, navItem.href))
    if (html) applyNavHtmlTitles(html, titles)
  }

  // EPUB2: toc.ncx
  const ncxHref =
    items.find((i) => /\.ncx$/i.test(i.href))?.href ??
    [...manifest.values()].find((h) => /\.ncx$/i.test(h)) ??
    null
  if (ncxHref && titles.size < 2) {
    const ncx = await readZipText(zip, resolvePath(opfDir, ncxHref))
    if (ncx) applyNcxTitles(ncx, titles)
  }

  return titles
}

function applyNavHtmlTitles(html: string, titles: Map<string, string>): void {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const links = doc.querySelectorAll('nav a[href], a[href]')
  links.forEach((a) => {
    const href = a.getAttribute('href')
    const label = (a.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (!href || !label || label.length < 2) return
    const key = normalizeHref(href.split('#')[0] ?? href)
    if (key && !titles.has(key)) titles.set(key, label)
  })
}

function applyNcxTitles(ncx: string, titles: Map<string, string>): void {
  const blocks = [
    ...ncx.matchAll(
      /<navPoint\b[\s\S]*?<text[^>]*>([\s\S]*?)<\/text>[\s\S]*?<content\b[^>]*src=["']([^"']+)["'][^>]*>/gi,
    ),
  ]
  for (const m of blocks) {
    const label = cleanupExtractedText(
      (m[1] ?? '').replace(/<[^>]+>/g, ''),
    )
    const src = m[2] ?? ''
    const key = normalizeHref(src.split('#')[0] ?? src)
    if (label && key && !titles.has(key)) titles.set(key, label)
  }
}

function normalizeHref(href: string): string {
  return href.replace(/\\/g, '/').replace(/^\.\//, '').toLowerCase()
}

function lookupTocTitle(
  titles: Map<string, string>,
  href: string,
): string | undefined {
  const key = normalizeHref(href)
  if (titles.has(key)) return titles.get(key)
  const base = key.split('/').pop()
  if (!base) return undefined
  for (const [k, v] of titles) {
    if (k === base || k.endsWith(`/${base}`)) return v
  }
  return undefined
}

async function readZipText(zip: JSZip, path: string): Promise<string | null> {
  const normalized = path.replace(/^\/+/, '')
  let entry = zip.file(normalized)
  if (!entry) {
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
  return rest
    .slice(0, c.index)
    .replace(/<[^>]+>/g, '')
    .trim()
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
