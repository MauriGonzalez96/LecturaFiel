# Migración Tauri + performance

## Estado

| Fase | Estado |
|------|--------|
| 1. Shell Tauri 2 | En curso (`src-tauri/`) |
| 2. Pipeline en Web Worker | Hecho (`runPipelineAsync` + `usePipelineResult`) |
| 3. Crate Rust/WASM | Stub (`crates/lectura-pipeline`) |
| 4. TTS Piper vía Tauri | Pendiente (SAPI WebView sigue; health.tts=false) |
| Legacy pywebview | Sigue disponible (`build.bat` / `desktop/`) |

## Desarrollo

```bash
# UI sola
npm run dev

# App escritorio Tauri (requiere Rust + WebView2)
npm run tauri:dev

# Legacy Python
npm run desktop:legacy
```

## Compilar WASM del motor

```bash
cargo install wasm-pack
wasm-pack build crates/lectura-pipeline --target web --out-dir ../../src/wasm/pipeline
```

## Notas TTS

En Tauri, `health.tts` está en `false` hasta portar Piper/neural.
La lectura con voces **Windows (SpeechSynthesis)** sigue funcionando en WebView2.
