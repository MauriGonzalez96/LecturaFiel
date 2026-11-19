# Lektor

Audiolibro / lector fiel al original: **simplificación léxica selectiva** y glosario.

No reescribe el libro. Solo interviene ante vocabulario verdaderamente poco habitual, arcaico o difícil para un lector moderno.

## Arranque (desarrollo web)

```bash
npm install
npm run dev
```

Abrí la URL de Vite (por defecto `http://localhost:5173`).

## Escritorio (Tauri)

```bash
npm run tauri:dev    # desarrollo
npm run tauri:build  # instalador NSIS
```

Requisitos: **Rust**, **WebView2**, Visual Studio Build Tools (C++).

El pipeline léxico corre en un **Web Worker**. Hay un crate Rust/WASM (`crates/lectura-pipeline`) con el mismo núcleo (léxico, arcaísmos, everyday, sinónimos). TTS: Piper, Neural (Edge) y voces Windows.

## Versión y actualizaciones

La versión vive en `package.json` (hoy `4.0.1`).

### Publicar una versión

1. Subí la versión en `package.json` (y en `src-tauri` si hace falta).
2. Commit y push a `main`.
3. Creá y pusheá el tag:

```bash
git tag v4.0.1
git push origin v4.0.1
```

4. GitHub Actions (**Release Tauri**) publica el instalador NSIS en [Releases](https://github.com/MauriGonzalez96/Lektor/releases).

### En la app

- Botón **Buscar actualizaciones** (arriba a la derecha).
- También chequea sola al abrir; si hay versión nueva → popup (Actualizar / Ahora no).

**Primera vez:** instalá el `.exe` del Release Tauri. Después, cada tag nuevo avisa de actualización.

### Si Windows bloquea el instalador (SmartScreen)

El instalable **no está firmado** con certificado de Microsoft, así que Windows suele avisar:

1. Clic derecho → **Propiedades** → **Desbloquear** → Aceptar.
2. O al abrirlo: **Más información** → **Ejecutar de todas formas**.

Los datos (voces Piper, preferencias) se guardan en `%LOCALAPPDATA%\Lektor`.

## Qué incluye

- **Ingesta:** PDF, EPUB, TXT y Markdown
- **Biblioteca** de hasta 8 libros con progreso (IndexedDB)
- **Archivo de glosario** por libro
- **PDF:** agrupa por capítulo literario o bloques de páginas
- Pipeline: detección → evaluación → sustitución mínima
- Audio: **Piper**, Windows y Neural Edge
- **Resumen IA:** explicación detallada del capítulo (conceptos del autor + intercambios), se escucha con «Resumen IA»

## Estructura

```
src/                      UI React + pipeline TS (Worker)
src-tauri/                App Tauri + TTS nativo
crates/lectura-pipeline/  Motor léxico Rust/WASM
SPEC.md
```

## Formatos

| Formato | Notas |
| --- | --- |
| EPUB | Mejor opción: capítulos según el spine |
| PDF | Solo si tiene texto seleccionable |
| TXT / MD | Parte por encabezados «Capítulo N» si existen |
