import { describe, expect, it } from 'vitest'
import { textHash } from './hash'

describe('textHash', () => {
  it('es estable ante espacios', () => {
    expect(textHash('hola   mundo')).toBe(textHash('hola mundo'))
  })

  it('cambia si cambia el texto', () => {
    expect(textHash('a')).not.toBe(textHash('b'))
  })
})
