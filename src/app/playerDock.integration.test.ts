import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')

describe('player dock + tema (integración de cableado)', () => {
  it('App monta el reproductor como footer dock fijo', () => {
    const app = readFileSync(resolve(root, 'src/App.tsx'), 'utf8')
    expect(app).toContain('player-dock')
    expect(app).toContain('variant="dock"')
    expect(app).toContain('has-player-dock')
    expect(app).not.toContain('sidebar-player')
  })

  it('CSS define dock fijo inferior', () => {
    const css = readFileSync(resolve(root, 'src/index.css'), 'utf8')
    expect(css).toMatch(/\.player-dock\s*\{[^}]*position:\s*fixed/s)
    expect(css).toMatch(/bottom:\s*0/)
    expect(css).toContain("[data-theme='dark']")
    expect(css).toContain('--player-dock-bg')
  })

  it('Settings expone selector de apariencia', () => {
    const settings = readFileSync(
      resolve(root, 'src/components/SettingsMenu.tsx'),
      'utf8',
    )
    expect(settings).toContain('useTheme')
    expect(settings).toContain('Apariencia')
    expect(settings).toContain('Oscuro')
  })

  it('index.html aplica tema antes del paint', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8')
    expect(html).toContain("lektor:theme")
    expect(html).toContain('dataset.theme')
  })
})
