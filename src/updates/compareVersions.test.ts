import { describe, expect, it } from 'vitest'
import { compareVersions, isRemoteNewer, parseVersion } from './compareVersions'

describe('compareVersions', () => {
  it('parsea tags con v', () => {
    expect(parseVersion('v0.3.0')).toEqual([0, 3, 0])
    expect(parseVersion('1.2')).toEqual([1, 2, 0])
  })

  it('detecta remoto más nuevo', () => {
    expect(isRemoteNewer('0.3.0', '0.3.1')).toBe(true)
    expect(isRemoteNewer('0.3.1', '0.3.0')).toBe(false)
    expect(isRemoteNewer('0.3.0', '0.3.0')).toBe(false)
    expect(compareVersions('0.2.0', '0.10.0')).toBeLessThan(0)
  })
})
