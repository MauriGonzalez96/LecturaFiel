import { describe, expect, it } from 'vitest'
import {
  applyCuts,
  buildSamples,
  collectJsonCandidates,
  joinBookText,
  parseCuts,
} from './detectChapters'
import type { BookChapter } from '../ingest/types'

function ch(title: string, text: string): BookChapter {
  return { number: 1, title, text }
}

describe('detectChapters helpers', () => {
  it('parsea JSON con chapters', () => {
    const cuts = parseCuts(
      JSON.stringify({
        chapters: [
          { title: 'Intro', startSample: 0 },
          { title: 'Medio', startSample: 2 },
          { title: 'Final', startSample: 5 },
        ],
      }),
      8,
    )
    expect(cuts).toEqual([
      { title: 'Intro', startSample: 0 },
      { title: 'Medio', startSample: 2 },
      { title: 'Final', startSample: 5 },
    ])
  })

  it('acepta markdown, trailing commas y start_sample', () => {
    const raw = `
Aquí va el resultado:
\`\`\`json
{
  "chapters": [
    { "title": "Prólogo", "start_sample": 0, },
    { "title": "Capítulo I", "startSample": 4, },
  ],
}
\`\`\`
`
    const cuts = parseCuts(raw, 10)
    expect(cuts.map((c) => c.title)).toEqual(['Prólogo', 'Capítulo I'])
    expect(cuts[1]!.startSample).toBe(4)
  })

  it('extrae el objeto balanceado aunque haya texto alrededor', () => {
    const raw =
      'Listo.\n{"chapters":[{"title":"A","startSample":0},{"title":"B","startSample":2}]}\nFin.'
    const candidates = collectJsonCandidates(raw)
    expect(candidates.some((c) => c.startsWith('{"chapters"'))).toBe(true)
    expect(parseCuts(raw, 5)).toHaveLength(2)
  })

  it('fuerza el primer corte en 0', () => {
    const cuts = parseCuts(
      '{"chapters":[{"title":"A","startSample":3},{"title":"B","startSample":6}]}',
      10,
    )
    expect(cuts[0]!.startSample).toBe(0)
  })

  it('aplica cortes sobre el texto unido', () => {
    const chapters = [
      ch('P1', 'Primera seccion del libro con texto largo suficiente para cortar. '),
      ch('P2', 'Segunda seccion distinta con mas contenido narrativo. '),
      ch('P3', 'Tercera seccion final del volumen de ejemplo. '),
    ]
    const full = joinBookText(chapters)
    const samples = buildSamples(chapters, full)
    expect(samples.length).toBeGreaterThanOrEqual(3)
    const next = applyCuts(full, samples, [
      { title: 'Uno', startSample: 0 },
      { title: 'Dos', startSample: 2 },
    ])
    expect(next.length).toBe(2)
    expect(next[0]!.title).toBe('Uno')
    expect(next[1]!.text.length).toBeGreaterThan(20)
  })
})
