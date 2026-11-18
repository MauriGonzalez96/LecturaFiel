import { describe, expect, it } from 'vitest'
import {
  conceptsFromPipeline,
  formatConceptsForPrompt,
} from './summaryConcepts'
import type { PipelineResult } from '../types/lexicon'

function emptyResult(
  partial: Partial<PipelineResult>,
): PipelineResult {
  return {
    originalText: '',
    adaptedText: '',
    candidates: [],
    substitutions: [],
    glossary: [],
    chapter: 1,
    stats: {
      wordsAnalyzed: 0,
      candidatesFound: 0,
      rarityDetected: 0,
      substituted: 0,
      glossaryOnly: 0,
      preservedLiterary: 0,
    },
    ...partial,
  }
}

describe('summaryConcepts', () => {
  it('deduplica intercambios y glosario', () => {
    const concepts = conceptsFromPipeline(
      emptyResult({
        substitutions: [
          {
            tokenIndex: 0,
            original: 'servidumbre',
            replacement: 'esclavitud',
            entry: {
              lemma: 'servidumbre',
              forms: ['servidumbre'],
              level: 3,
              definition: 'Estado de dependencia forzada.',
              defaultDecision: 'substitute',
            },
          },
        ],
        glossary: [
          {
            id: '1',
            word: 'Servidumbre',
            lemma: 'servidumbre',
            definition: 'Estado de dependencia forzada.',
            kind: 'substituted',
            audioExpression: 'esclavitud',
            originalSentence:
              'El camino de servidumbre comienza con la planificación central.',
            chapter: 1,
            level: 3,
          },
        ],
      }),
    )
    expect(concepts).toHaveLength(1)
    expect(concepts[0]!.term.toLowerCase()).toBe('servidumbre')
    expect(concepts[0]!.plain).toBe('esclavitud')
    expect(concepts[0]!.context).toMatch(/planificación/)
  })

  it('formatea bloque para el prompt', () => {
    const block = formatConceptsForPrompt([
      {
        term: 'colectivismo',
        plain: 'control grupal',
        definition: 'Prioridad del grupo sobre el individuo.',
        context: 'El colectivismo concentra el poder.',
      },
    ])
    expect(block).toMatch(/Integrálos/)
    expect(block).toMatch(/colectivismo/)
    expect(block).toMatch(/control grupal/)
  })
})
