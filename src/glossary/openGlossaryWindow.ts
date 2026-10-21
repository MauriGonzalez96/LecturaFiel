import type { GlossaryBookRecord } from './types'
import type { GlossaryItem } from '../types/lexicon'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderItem(item: GlossaryItem): string {
  const kind =
    item.kind === 'substituted' ? 'Sustituida' : 'Conservada'
  const audio = item.audioExpression
    ? `<p class="meta"><span>En el audio</span> ${escapeHtml(item.audioExpression)}</p>`
    : ''
  return `<li class="item">
    <header>
      <strong>${escapeHtml(item.word)}</strong>
      <span class="pill">${kind}</span>
      <span class="pill">N${item.level}</span>
    </header>
    <p class="def">${escapeHtml(item.definition)}</p>
    ${audio}
    <p class="meta quote"><span>Cap. ${item.chapter}</span> «${escapeHtml(item.originalSentence)}»</p>
  </li>`
}

function pageShell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0; padding: 1.25rem 1.35rem 2rem;
    font-family: "Segoe UI", system-ui, sans-serif;
    background: #e8eef4; color: #1a2433; line-height: 1.45;
  }
  h1 { font-size: 1.35rem; margin: 0 0 0.35rem; }
  .sub { color: #5a6a7a; margin: 0 0 1.25rem; font-size: 0.92rem; }
  h2 {
    font-size: 1.05rem; margin: 1.35rem 0 0.65rem;
    padding-bottom: 0.35rem; border-bottom: 1px solid #c5d0db;
  }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
  .item {
    background: #fff; border: 1px solid #c5d0db; border-radius: 10px; padding: 0.85rem 1rem;
  }
  header { display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: baseline; margin-bottom: 0.35rem; }
  .pill {
    font-size: 0.72rem; padding: 0.15rem 0.45rem; border-radius: 999px;
    background: #e7f5f2; color: #0f7a6c;
  }
  .def { margin: 0 0 0.4rem; }
  .meta { margin: 0.25rem 0 0; font-size: 0.88rem; color: #5a6a7a; }
  .meta span { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .quote { font-style: italic; }
  .empty { color: #5a6a7a; }
</style>
</head>
<body>
${body}
</body>
</html>`
}

/** Abre el glosario en otra ventana (el audio de la principal sigue). */
export function openGlossaryWindow(opts: {
  mode: 'book' | 'general'
  bookTitle?: string
  bookItems?: GlossaryItem[]
  archive?: GlossaryBookRecord[]
}): boolean {
  const title =
    opts.mode === 'book'
      ? `Glosario · ${opts.bookTitle || 'Este libro'}`
      : 'Glosario general · Lectura Fiel'

  let body = `<h1>${escapeHtml(title)}</h1>`

  if (opts.mode === 'book') {
    const items = opts.bookItems ?? []
    body += `<p class="sub">${items.length} entrada${items.length === 1 ? '' : 's'}</p>`
    body +=
      items.length === 0
        ? `<p class="empty">Todavía no hay palabras en este libro.</p>`
        : `<ul>${items.map(renderItem).join('')}</ul>`
  } else {
    const books = opts.archive ?? []
    const total = books.reduce((n, b) => n + b.entries.length, 0)
    body += `<p class="sub">${books.length} libro${books.length === 1 ? '' : 's'} · ${total} entradas</p>`
    if (books.length === 0) {
      body += `<p class="empty">El archivo de glosario está vacío.</p>`
    } else {
      for (const book of books) {
        body += `<h2>${escapeHtml(book.title)} <small>(${book.entries.length})</small></h2>`
        body +=
          book.entries.length === 0
            ? `<p class="empty">Sin entradas.</p>`
            : `<ul>${book.entries.map(renderItem).join('')}</ul>`
      }
    }
  }

  const features =
    'popup=yes,width=540,height=760,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes'
  const win = window.open('', 'lectura-fiel-glossary', features)
  if (!win) return false

  win.document.open()
  win.document.write(pageShell(title, body))
  win.document.close()
  try {
    win.focus()
  } catch {
    /* ignore */
  }
  return true
}
