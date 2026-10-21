import { beforeEach, describe, expect, it } from 'vitest'
import { SAMPLE_CHAPTER } from '../data/sampleChapter'
import { decisionCache } from './decisionCache'
import { detectCandidates } from './detector'
import { matchCasing } from './tokenizer'
import { runPipeline } from './pipeline'

describe('matchCasing', () => {
  it('preserva mayúscula inicial', () => {
    expect(matchCasing('Empero', 'sin embargo')).toBe('Sin embargo')
  })

  it('preserva todo mayúsculas', () => {
    expect(matchCasing('EMPERO', 'sin embargo')).toBe('SIN EMBARGO')
  })

  it('deja minúsculas', () => {
    expect(matchCasing('empero', 'sin embargo')).toBe('sin embargo')
  })
})

describe('detectCandidates', () => {
  it('detecta lemas N2–N3 del semilla y no N1', () => {
    const { candidates } = detectCandidates(
      'La melancolía y el agua cristalina; empero llegó el sofisma.',
    )
    const lemmas = candidates.map((c) => c.entry.lemma)
    expect(lemmas).toContain('empero')
    expect(lemmas).toContain('sofisma')
    expect(lemmas).not.toContain('melancolia')
    expect(lemmas).not.toContain('cristalino')
  })

  it('marca rareza fuera del semilla y del vocabulario frecuente', () => {
    const { candidates, rarityCount } = detectCandidates(
      'El camino era largo y apareció un hipogrifo entre las rocas.',
    )
    expect(rarityCount).toBeGreaterThan(0)
    expect(
      candidates.some((c) => c.token.normalized.includes('hipogrifo')),
    ).toBe(true)
    // "camino" es frecuente / corto → no candidata por rareza
    expect(
      candidates.some((c) => c.token.normalized === 'camino'),
    ).toBe(false)
  })

  it('nivel 1 solo admite N3 y sin rareza', () => {
    const { candidates, rarityCount } = detectCandidates(
      'Empero el sofisma y un hipogrifo.',
      undefined,
      {
        modeId: '1',
        minLevel: 3,
        includeRarity: false,
        forceSubstitute: false,
        preferSimplest: false,
        includeLiterary: false,
      },
    )
    const lemmas = candidates.map((c) => c.entry.lemma)
    expect(lemmas).toContain('empero')
    expect(lemmas).not.toContain('sofisma')
    expect(rarityCount).toBe(0)
  })
})

describe('modo 4 simple', () => {
  beforeEach(() => {
    decisionCache.clear()
  })

  it('usa palabras más fáciles y toca literario', () => {
    const result = runPipeline(
      'La melancolía del paraje; empero siguió.',
      {
        chapter: 1,
        intervention: {
          modeId: '4',
          minLevel: 1,
          includeRarity: true,
          forceSubstitute: true,
          preferSimplest: true,
          includeLiterary: true,
        },
      },
    )
    const lower = result.adaptedText.toLowerCase()
    expect(lower).toContain('tristeza')
    expect(lower).toContain('pero')
    expect(lower).not.toContain('melancolía')
    expect(lower).not.toContain('empero')
  })
})

describe('runPipeline', () => {
  beforeEach(() => {
    decisionCache.clear()
  })

  it('sustituye arcaísmos y conserva literario del demo', () => {
    const result = runPipeline(SAMPLE_CHAPTER.text, SAMPLE_CHAPTER.number)
    expect(result.stats.wordsAnalyzed).toBeGreaterThan(50)
    expect(result.stats.substituted).toBeGreaterThan(0)
    expect(result.adaptedText).not.toContain(' empero,')
    expect(result.adaptedText.toLowerCase()).toContain('sin embargo')
    expect(result.adaptedText).toContain('melancolía')
    expect(result.glossary.length).toBeGreaterThan(0)
  })

  it('conserva «por ende» y no lo sustituye', () => {
    const result = runPipeline(
      'El argumento falló; por ende, nadie lo toma en serio.',
      1,
    )
    const ende = result.candidates.find((c) => c.entry.lemma === 'ende')
    expect(ende).toBeTruthy()
    expect(result.adaptedText.toLowerCase()).toContain('por ende')
    expect(
      result.substitutions.some((s) => s.entry.lemma === 'ende'),
    ).toBe(false)
  })

  it('sí evalúa «ende» suelto como arcaísmo', () => {
    const result = runPipeline('Erró el cálculo, ende cambió de plan.', 1)
    expect(
      result.substitutions.some((s) => s.entry.lemma === 'ende'),
    ).toBe(true)
    expect(result.adaptedText.toLowerCase()).toContain('por eso')
  })

  it('candidatas por rareza van a glosario sin sustituir', () => {
    const result = runPipeline(
      'Entre las ruinas hallaron un basilisco de piedra.',
      1,
    )
    expect(result.stats.rarityDetected).toBeGreaterThan(0)
    const rare = result.glossary.find((g) =>
      g.lemma.includes('basilisco'),
    )
    expect(rare?.kind).toBe('preserved_difficult')
    expect(result.adaptedText).toContain('basilisco')
  })
})
