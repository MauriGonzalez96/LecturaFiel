import { beforeEach, describe, expect, it } from 'vitest'
import { isEverydayWord } from './everydayVocabulary'
import {
  addUserEveryday,
  clearUserEveryday,
  isUserEveryday,
  listUserEveryday,
  removeUserEveryday,
} from './userEveryday'
import { decisionCache } from '../engine/decisionCache'
import { runPipeline } from '../engine/pipeline'

describe('userEveryday', () => {
  beforeEach(() => {
    clearUserEveryday()
    decisionCache.clear()
  })

  it('agrega y quita palabras', () => {
    expect(addUserEveryday('Planificación', 'HOSTILIDAD')).toBe(2)
    expect(listUserEveryday()).toEqual(['hostilidad', 'planificacion'])
    expect(isUserEveryday('planificación')).toBe(true)
    expect(isEverydayWord('planificación')).toBe(true)
    removeUserEveryday('planificacion')
    expect(isUserEveryday('planificación')).toBe(false)
  })

  it('evita que se sustituya una palabra marcada como cotidiana', () => {
    addUserEveryday('empero')
    const result = runPipeline('Empero llegó tarde.', {
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
    expect(result.adaptedText.toLowerCase()).toContain('empero')
    expect(result.stats.substituted).toBe(0)
  })
})
