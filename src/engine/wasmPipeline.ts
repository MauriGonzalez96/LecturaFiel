/**
 * Puente opcional al motor Rust/WASM.
 * Si el módulo no está compilado, se ignora y sigue el Worker TS.
 *
 * Generar con:
 *   wasm-pack build crates/lectura-pipeline --target web --out-dir ../../src/wasm/pipeline
 */

export type WasmPipelineModule = {
  wasm_tokenize: (text: string) => unknown
  wasm_run_pipeline_stub: (text: string, chapter: number) => unknown
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
