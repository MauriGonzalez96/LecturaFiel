import { describe, expect, it } from 'vitest'
import { lookupEasySynonym } from './easySynonyms'

describe('easySynonyms', () => {
  it('resuelve formas del fragmento típico', () => {
    expect(lookupEasySynonym('planificación')?.simple).toBe('plan')
    expect(lookupEasySynonym('eficazmente')?.simple).toBe('bien')
    expect(lookupEasySynonym('hostilidad')?.simple).toBe('odio')
    expect(lookupEasySynonym('encubren')?.simple).toBe('esconden')
  })

  it('adapta clíticos', () => {
    const hit = lookupEasySynonym('reemplazarla')
    expect(hit?.simple).toMatch(/cambiar/)
  })

  it('devuelve null si no hay mapa', () => {
    expect(lookupEasySynonym('hipogrifoxyz')).toBeNull()
  })
})
