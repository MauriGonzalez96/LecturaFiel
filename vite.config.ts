/// <reference types="vitest/config" />
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8'),
) as { version: string }

/** Escribe version.json en dist para que el .exe / health la lean. */
function emitVersionJson() {
  return {
    name: 'emit-version-json',
    closeBundle() {
      const out = resolve(__dirname, 'dist', 'version.json')
      writeFileSync(out, JSON.stringify({ version: pkg.version }, null, 0))
    },
  }
}

export default defineConfig({
  plugins: [react(), emitVersionJson()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
