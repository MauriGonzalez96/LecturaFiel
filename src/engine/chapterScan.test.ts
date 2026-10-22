import { describe, expect, it } from 'vitest'
import { isEverydayWord } from '../data/everydayVocabulary'
import { scanChapterOutsideEveryday } from './chapterScan'

describe('capítulo vs vocabulario cotidiano', () => {
  it('trata lo cotidiano como normal', () => {
    expect(isEverydayWord('casa')).toBe(true)
    expect(isEverydayWord('hablar')).toBe(true)
    expect(isEverydayWord('yantar')).toBe(false)
    expect(isEverydayWord('planificación')).toBe(false)
  })

  it('busca en el capítulo lo que no es cotidiano', () => {
    const scan = scanChapterOutsideEveryday(
      'La casa es grande. Empero el ome quiso yantar agora con hostilidad.',
    )
    const norms = scan.outliers.map((o) => o.normalized)
    expect(norms.some((n) => n.includes('empero') || n === 'empero')).toBe(true)
    expect(scan.outliers.some((o) => o.canReplace)).toBe(true)
  })

  it('marca reemplazables cuando hay sinónimo', () => {
    const scan = scanChapterOutsideEveryday(
      'La planificación del mercado genera hostilidad.',
    )
    expect(scan.outliers.length).toBeGreaterThan(0)
    expect(scan.replaceableCount).toBeGreaterThan(0)
    const hostil = scan.outliers.find((o) =>
      o.normalized.replace(/á/g, 'a').includes('hostilidad'),
    )
    expect(hostil?.canReplace).toBe(true)
  })
})
