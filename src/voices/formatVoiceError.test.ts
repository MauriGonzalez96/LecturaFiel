import { describe, expect, it } from 'vitest'
import { formatVoiceError } from './api'

describe('formatVoiceError', () => {
  it('usa message de Error', () => {
    expect(formatVoiceError(new Error('falló Edge'), 'fallback')).toBe(
      'falló Edge',
    )
  })

  it('acepta string crudo', () => {
    expect(formatVoiceError('sin conexión', 'fallback')).toBe('sin conexión')
  })

  it('cae al fallback', () => {
    expect(formatVoiceError(null, 'No se pudo reproducir')).toBe(
      'No se pudo reproducir',
    )
  })
})
