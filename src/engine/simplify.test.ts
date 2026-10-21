import { describe, expect, it } from 'vitest'
import type { LexiconEntry } from '../types/lexicon'
import { pickSubstitute, synthesizeFromDefinition } from './simplify'

const entry = (partial: Partial<LexiconEntry>): LexiconEntry => ({
  lemma: 'x',
  forms: ['x'],
  level: 2,
  definition: 'Tristeza vaga y profunda.',
  defaultDecision: 'substitute',
  ...partial,
})

describe('simplify', () => {
  it('sintetiza idea corta desde la definición', () => {
    expect(synthesizeFromDefinition('Tristeza vaga, profunda y sosegada.')).toBe(
      'tristeza vaga',
    )
  })

  it('modo simple usa simpleSubstitute', () => {
    expect(
      pickSubstitute(
        entry({
          preferredSubstitute: 'sin embargo',
          simpleSubstitute: 'pero',
        }),
        true,
      ),
    ).toBe('pero')
  })

  it('modo simple mapea preferred a forma fácil', () => {
    expect(
      pickSubstitute(
        entry({ preferredSubstitute: 'sin embargo', simpleSubstitute: null }),
        true,
      ),
    ).toBe('pero')
  })

  it('modo normal respeta preferredSubstitute', () => {
    expect(
      pickSubstitute(
        entry({
          preferredSubstitute: 'sin embargo',
          simpleSubstitute: 'pero',
        }),
        false,
      ),
    ).toBe('sin embargo')
  })

  it('no inventa sustituto sin sinónimo curado', () => {
    expect(
      pickSubstitute(entry({ preferredSubstitute: null, simpleSubstitute: null }), true),
    ).toBeNull()
  })

  it('no sustituye entradas sintéticas (rareza)', () => {
    expect(
      pickSubstitute(
        entry({
          synthetic: true,
          preferredSubstitute: null,
          definition: 'Palabra poco frecuente en el uso cotidiano.',
        }),
        true,
      ),
    ).toBeNull()
  })

  it('rechaza sustitutos basura de caché', () => {
    expect(
      pickSubstitute(
        entry({ preferredSubstitute: 'pero' }),
        true,
        'palabra poco frecuente',
      ),
    ).toBeNull()
  })
})
