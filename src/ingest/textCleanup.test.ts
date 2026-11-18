import { describe, expect, it } from 'vitest'
import { splitIntoChaptersDetailed } from './textCleanup'

describe('splitIntoChaptersDetailed', () => {
  it('parte por encabezados clásicos', () => {
    const text = `
Capítulo I: El comienzo
Había una vez un argumento largo sobre la libertad económica y el Estado.

Capítulo II: El conflicto
Luego el autor desarrolla la tesis con más detalle y ejemplos históricos.
`
    const { chapters, kind } = splitIntoChaptersDetailed(text, 'Libro')
    expect(kind).toBe('classic')
    expect(chapters.length).toBeGreaterThanOrEqual(2)
    expect(chapters[0]!.title).toMatch(/Capítulo I/i)
  })

  it('usa markdown como partición débil', () => {
    const text = `
# Primera idea
Un bloque de texto suficientemente largo para contar como sección válida del libro.

## Segunda idea
Otro bloque distinto con suficiente extensión para no descartarse por longitud.
`
    const { chapters, kind } = splitIntoChaptersDetailed(text, 'Notas')
    expect(kind).toBe('weak')
    expect(chapters.length).toBeGreaterThanOrEqual(2)
  })

  it('queda una sola sección si no hay encabezados', () => {
    const text =
      'Solo un párrafo continuo sin marcas de capítulo ni numeración especial en todo el documento.'
    const { chapters, kind } = splitIntoChaptersDetailed(text, 'Todo')
    expect(kind).toBe('none')
    expect(chapters).toHaveLength(1)
  })
})
