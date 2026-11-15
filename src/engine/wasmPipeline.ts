/**
 * Puente opcional al motor Rust/WASM.
 * El Worker TypeScript sigue siendo la ruta de producción (glosario completo).
 * WASM aporta el mismo núcleo léxico para pruebas / uso futuro.
 *
 * Generar:
 *   npm run data:export && npm run wasm:pipeline
 */

export type WasmPipelineResult = {
  original_text?: string
  adapted_text?: string
  chapter?: number
  mode?: number
  stats?: {
    words_analyzed?: number
    candidates_found?: number
    rarity_detected?: number
    substituted?: number
    glossary_only?: number
    preserved_literary?: number
  }
  note?: string
}

export type WasmPipelineModule = {
  wasm_tokenize: (text: string) => unknown
  wasm_run_pipeline: (text: string, chapter: number, mode: number) => WasmPipelineResult
  default?: () => Promise<unknown>
}

let cached: WasmPipelineModule | null | undefined

export async function loadWasmPipeline(): Promise<WasmPipelineModule | null> {
  if (cached !== undefined) return cached
  try {
    const url = new URL('../wasm/pipeline/lectura_pipeline.js', import.meta.url)
    const mod = (await import(/* @vite-ignore */ url.href)) as WasmPipelineModule
    if (typeof mod.default === 'function') {
      await mod.default()
    }
    cached = mod
    return mod
  } catch {
    cached = null
    return null
  }
}

export async function wasmAvailable(): Promise<boolean> {
  return (await loadWasmPipeline()) != null
}

export async function runWasmPipeline(
  text: string,
  chapter = 1,
  mode = 3,
): Promise<WasmPipelineResult | null> {
  const mod = await loadWasmPipeline()
  if (!mod?.wasm_run_pipeline) return null
  return mod.wasm_run_pipeline(text, chapter, mode)
}
