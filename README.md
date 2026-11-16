# Lectura Fiel

Audiolibro / lector fiel al original: **simplificación léxica selectiva** y glosario.

No reescribe el libro. Solo interviene ante vocabulario verdaderamente poco habitual, arcaico o difícil para un lector moderno.

## Arranque (desarrollo web)

```bash
npm install
npm run dev
```

Abrí la URL de Vite (por defecto `http://localhost:5173`).

## Escritorio

### Tauri / Rust (recomendado)

```bash
npm run tauri:dev    # desarrollo
npm run tauri:build  # instalador NSIS
```

Requisitos: **Rust**, **WebView2**, Visual Studio Build Tools (C++).  
Detalle: [`docs/TAURI_MIGRATION.md`](docs/TAURI_MIGRATION.md).

El pipeline léxico corre en un **Web Worker**. Hay un crate Rust/WASM (`crates/lectura-pipeline`) con el mismo núcleo (léxico, arcaísmos, everyday, sinónimos). TTS: Piper, Neural (Edge) y voces Windows.

### Legacy (pywebview + PyInstaller)

```bat
build.bat
```

O sin empaquetar: `npm run desktop:legacy` / `desktop\run_dev.bat`.  
Requisitos: Python 3, WebView2, `pip install -r desktop\requirements.txt`.

Cada build legacy va a `release\vX.Y.Z\`.

## Versión y actualizaciones

La versión vive en `package.json` (hoy `0.3.10`).

### Publicar una versión (automático)

1. Subí la versión en `package.json` (ej. `0.3.10`).
2. Commit y push a `main`.
3. Creá y pusheá el tag:

```bash
git tag v0.3.10
git push origin v0.3.10
```

4. GitHub Actions publica:
   - **Release** → `.exe` PyInstaller (legacy)
   - **Release Tauri** → instalador NSIS  
   En [Releases](https://github.com/MauriGonzalez96/LecturaFiel/releases).

### En la app

- Botón **Buscar actualizaciones** (arriba a la derecha).
- También chequea sola al abrir; si hay versión nueva → popup (Actualizar / Ahora no).

**Primera vez:** alguien tiene que instalar/abrir un `.exe` (el del Release). Después, cada tag nuevo actualiza solo vía ese aviso.

### Si Windows bloquea el .exe (“permisos” / SmartScreen)

El instalable **no está firmado** con certificado de Microsoft, así que Windows suele avisar:

1. Clic derecho en `LecturaFiel.exe` → **Propiedades**.
2. En la pestaña General, abajo: marcá **Desbloquear** → Aceptar.
3. O al abrirlo: **Más información** → **Ejecutar de todas formas**.

Los datos (voces Piper, preferencias) se guardan en `%LOCALAPPDATA%\LecturaFiel`, no al lado del `.exe`, para evitar errores de escritura.

## Qué incluye este MVP

- **Ingesta de archivos:** PDF, EPUB, TXT y Markdown (arrastrar o elegir)
- **Biblioteca de hasta 8 libros abiertos** con progreso guardado (IndexedDB; avisos si falla el guardado)
- **Archivo de glosario** por libro (JSON único, sin tope): se acumula al leer, se puede descargar/importar y consultar libros ya quitados de los slots
- **PDF:** agrupa por capítulo literario (o bloques de páginas) en lugar de una entrada por página
- **Cambios mínimos** arriba del texto (sin scrollear al final)
- División por capítulos (EPUB por spine; PDF/TXT por encabezados o bloques)
- Pipeline en 3 etapas: detección → evaluación → sustitución mínima
- Umbral alto (niveles 0–3); solo N2–N3 son candidatas
- Léxico semilla ampliado (arcaísmos, cultismos, casos polisémicos)
- Capítulo demo + glosario + **Repaso**
- Audio: **Piper** (modelo local), Windows y Neural Edge (online)
- Pestaña **Voces**: listar, escuchar muestra, descargar Piper y guardar
- Primera apertura del exe: descarga `es_AR-daniela-high` (Piper) y la usa
- Caché de decisiones en `localStorage`

## Estructura

```
src/                   UI React + pipeline TS (Worker)
src-tauri/             App Tauri + TTS nativo
crates/lectura-pipeline/  Motor léxico Rust/WASM
desktop/               Legacy pywebview + PyInstaller
docs/TAURI_MIGRATION.md
SPEC.md
```

## Formatos

| Formato | Notas |
| --- | --- |
| EPUB | Mejor opción: capítulos según el spine del libro |
| PDF | Solo si tiene texto seleccionable (no escaneos puros) |
| TXT / MD | Parte por encabezados «Capítulo N» si existen |

## Audio continuo

Con **Avisar al terminar** (activo por defecto), al terminar el audio de un capítulo/página aparece un diálogo: te avisa que terminaste y pregunta si querés continuar con el siguiente. Si es el último, solo confirma el fin de la lectura. Los textos largos se parten en trozos para Piper/Edge (sin truncar el capítulo).

## Próximos pasos naturales

- Ampliar el vocabulario frecuente / frecuencias de corpus reales
- Evaluación contextual con modelo (solo N2–N3)
- OCR para PDF escaneados
- Exportación de audio / glosario
