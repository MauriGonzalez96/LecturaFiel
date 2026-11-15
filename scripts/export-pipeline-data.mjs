/** Exporta datos léxicos TS → JSON para crates/lectura-pipeline. */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outDir = path.join(root, 'crates/lectura-pipeline/data')
fs.mkdirSync(outDir, { recursive: true })

function write(name, data) {
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(data))
  console.log(name, Array.isArray(data) ? data.length : Object.keys(data).length)
}

// ── Archaisms ──────────────────────────────────────────────────────────────
{
  const t = fs.readFileSync(path.join(root, 'src/data/archaisms.ts'), 'utf8')
  const arch = []
  for (const b of t.split(/\{\s*\n\s*lemma:/).slice(1)) {
    const lemma = (b.match(/^\s*'([^']+)'/) || [])[1]
    const formsM = b.match(/forms:\s*\[([^\]]+)\]/)
    const pref = (b.match(/preferredSubstitute:\s*'([^']*)'/) || [])[1]
    if (!formsM || !pref) continue
    const forms = [...formsM[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
    arch.push({ lemma, forms, preferredSubstitute: pref })
  }
  write('archaisms.json', arch)
}

// ── Easy synonyms ──────────────────────────────────────────────────────────
{
  const src = fs.readFileSync(path.join(root, 'src/data/easySynonyms.ts'), 'utf8')
  const rawMatch = src.match(
    /const RAW: Record<string, EasySynonym> = \{([\s\S]*?)\n\}/,
  )
  if (!rawMatch) throw new Error('easySynonyms RAW not found')
  const entries = []
  const re =
    /([a-z0-9_]+):\s*\{\s*preferred:\s*'([^']*)',\s*simple:\s*'([^']*)'/g
  let m
  while ((m = re.exec(rawMatch[1]))) {
    entries.push({ form: m[1], preferred: m[2], simple: m[3] })
  }
  write('easy_synonyms.json', entries)
}

// ── Everyday vocabulary ────────────────────────────────────────────────────
{
  const words = new Set()
  const ev = fs.readFileSync(
    path.join(root, 'src/data/everydayVocabulary.ts'),
    'utf8',
  )
  const extra = (ev.match(/const EXTRA_CLEAN = `([\s\S]*?)`/) || [])[1] || ''
  for (const w of extra.split(/\s+/)) {
    const t = w.trim().toLowerCase()
    if (t) words.add(t)
  }
  const cs = fs.readFileSync(path.join(root, 'src/data/commonSpanish.ts'), 'utf8')
  for (const tm of cs.matchAll(/`([\s\S]*?)`/g)) {
    for (const w of tm[1].split(/\s+/)) {
      const t = w.trim().toLowerCase()
      if (t && /^[a-z0-9ñ]+$/i.test(t)) words.add(t)
    }
  }
  for (const m of cs.matchAll(/'([a-z0-9ñ]+)'/gi)) {
    words.add(m[1].toLowerCase())
  }
  write('everyday.json', [...words].sort())
}

// ── Seed lexicon (sin archaisms; el crate los fusiona) ─────────────────────
{
  const src = fs.readFileSync(path.join(root, 'src/data/lexicon.ts'), 'utf8')
  // Solo el array SEED antes del spread de arcaísmos
  const cut = src.split('...ARCHAISM_LEXICON')[0]
  const entries = []
  for (const b of cut.split(/\{\s*\n\s*lemma:/).slice(1)) {
    const lemma = (b.match(/^\s*'([^']+)'/) || [])[1]
    const formsM = b.match(/forms:\s*\[([^\]]+)\]/)
    const level = Number((b.match(/level:\s*(\d+)/) || [])[1] || 0)
    const pref = (b.match(/preferredSubstitute:\s*'([^']*)'/) || [])[1] || null
    const simple = (b.match(/simpleSubstitute:\s*'([^']*)'/) || [])[1] || null
    const decision = (b.match(/defaultDecision:\s*'([^']+)'/) || [])[1] || 'evaluate'
    if (!lemma || !formsM) continue
    const forms = [...formsM[1].matchAll(/'([^']+)'/g)].map((x) => x[1])
    entries.push({
      lemma,
      forms,
      level,
      preferredSubstitute: pref,
      simpleSubstitute: simple,
      defaultDecision: decision,
    })
  }
  write('seed_lexicon.json', entries)
}
