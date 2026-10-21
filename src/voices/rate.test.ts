import { describe, expect, it } from 'vitest'
import {
  clampSpeechRate,
  speechRateLabel,
  toEdgeRatePercent,
  toPiperLengthScale,
} from './rate'

describe('speech rate helpers', () => {
  it('clampa fuera de rango', () => {
    expect(clampSpeechRate(0.1)).toBe(0.7)
    expect(clampSpeechRate(3)).toBe(1.35)
  })

  it('edge percent y piper length_scale', () => {
    expect(toEdgeRatePercent(1)).toBe('+0%')
    expect(toEdgeRatePercent(1.2)).toBe('+20%')
    expect(toEdgeRatePercent(0.8)).toBe('-20%')
    expect(toPiperLengthScale(1)).toBe(1)
    expect(toPiperLengthScale(2)).toBeCloseTo(1 / 1.35, 2)
  })

  it('etiquetas', () => {
    expect(speechRateLabel(0.75)).toBe('Lenta')
    expect(speechRateLabel(1)).toBe('Normal')
    expect(speechRateLabel(1.3)).toBe('Rápida')
  })
})
