# Migración Tauri + performance

## Estado

| Fase | Estado |
|------|--------|
| 1. Shell Tauri 2 | Hecho |
| 2. Pipeline en Web Worker | Hecho |
| 3. Crate Rust/WASM | Hecho (léxico + arcaísmos + everyday + sinónimos) |
| 4. TTS Piper/Neural vía Tauri | Hecho |
| Legacy pywebview | Disponible (`npm run desktop:legacy` / `build.bat`) |

## Desarrollo

```bash
npm run dev          # UI sola
npm run tauri:dev    # App escritorio (Rust + WebView2)
npm run desktop:legacy
```

## Datos + WASM del motor

```bash
npm run data:export      # TS → crates/lectura-pipeline/data/*.json
npm run wasm:pipeline    # wasm-pack → src/wasm/pipeline/ (gitignored)
```

El **Worker TypeScript** es la ruta de lectura en producción (glosario/UI).  
El crate Rust/WASM replica el núcleo léxico para tests y uso futuro.

## TTS

- **Neural**: `msedge-tts` (Edge Read Aloud)
- **Piper**: CLI oficial + modelos HuggingFace en `%LOCALAPPDATA%\LecturaFiel`
- **Windows SpeechSynthesis**: fallback en WebView2
