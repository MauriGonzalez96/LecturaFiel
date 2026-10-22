import { describe, expect, it } from 'vitest'
import { decisionCache } from '../engine/decisionCache'
import { runPipeline } from '../engine/pipeline'
import { ARCHAISM_LEXICON } from './archaisms'
import { SEED_LEXICON } from './lexicon'

describe('archaisms lexicon', () => {
  it('incluye un bloque amplio de arcaísmos con sustituto simple', () => {
    expect(ARCHAISM_LEXICON.length).toBeGreaterThan(50)
    for (const e of ARCHAISM_LEXICON) {
      expect(e.level).toBeGreaterThanOrEqual(2)
      expect(
        e.simpleSubstitute || e.preferredSubstitute || e.defaultDecision === 'glossary_only',
      ).toBeTruthy()
    }
    expect(SEED_LEXICON.length).toBeGreaterThan(ARCHAISM_LEXICON.length)
  })

  it('sustituye arcaísmos por la idea moderna (modo 3)', () => {
    decisionCache.clear()
    const result = runPipeline(
      'Yantar agora es menester, maguer el ome esté cativo; otrosí el doncel vide un fermoso paraje.',
      {
        chapter: 1,
        intervention: {
          modeId: '3',
          minLevel: 2,
          includeRarity: true,
          forceSubstitute: false,
          preferSimplest: false,
          includeLiterary: false,
        },
      },
    )
    const lower = result.adaptedText.toLowerCase()
    expect(lower).toContain('comer')
    expect(lower).toContain('ahora')
    expect(lower).toMatch(/aunque|hombre|hermoso|bonito|prisionero|cautivo/)
    expect(result.stats.substituted).toBeGreaterThan(3)
  })

  it('modo 4 usa la forma más fácil del arcaísmo', () => {
    decisionCache.clear()
    const result = runPipeline('Empero el sandio fabló asaz.', {
      chapter: 1,
      intervention: {
        modeId: '4',
        minLevel: 1,
        includeRarity: true,
        forceSubstitute: true,
        preferSimplest: true,
        includeLiterary: true,
      },
    })
    const lower = result.adaptedText.toLowerCase()
    expect(lower).toContain('pero')
    expect(lower).toContain('tonto')
    expect(lower).toContain('hablar')
    expect(lower).toContain('bastante')
  })
})
