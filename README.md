# Lectura Fiel

Audiolibro / lector fiel al original: **simplificación léxica selectiva** y glosario.

No reescribe el libro. Solo interviene ante vocabulario verdaderamente poco habitual, arcaico o difícil para un lector moderno.

## Arranque (desarrollo web)

```bash
npm install
npm run dev
```

Abrí la URL de Vite (por defecto `http://localhost:5173`).

## Ejecutable de escritorio (como MixCS)

Mismo patrón: **pywebview (WebView2)** + servidor local + **PyInstaller**.

- Botón **Cerrar** en la UI (solo visible en el `.exe`)
- La **X** del sistema pide la misma confirmación
- Al salir: se detiene el servidor y se llama `os._exit(0)` para no dejar procesos vivos

```bat
build.bat
```

Cada build va a su carpeta: `release\vX.Y.Z\` (la versión sale de `package.json`). Adentro están `LecturaFiel.exe`, `LecturaFiel-vX.Y.Z.exe` y `VERSION.txt`. Las versiones anteriores no se pisan. `release\LATEST.txt` indica cuál fue la última build. La ventana y el pie de la app también muestran `vX.Y.Z`.

Para probar el launcher sin empaquetar:

```bat
desktop\run_dev.bat
```

Requisitos: Python 3, WebView2 Runtime (Windows 10/11 lo trae), `pip install -r desktop\requirements.txt`.

## Versión y actualizaciones

La versión vive en `package.json` (hoy `0.3.0`). Al subir features, aumentala antes de `build.bat`. El resultado queda en `release\v0.3.0\`.

Para que la app avise actualizaciones:

1. Creá un **GitHub Release** en [MauriGonzalez96/LecturaFiel](https://github.com/MauriGonzalez96/LecturaFiel/releases) con tag `v0.3.0` (o la versión que sea).
2. Adjuntá el asset `LecturaFiel-v0.3.0.exe` (o `LecturaFiel.exe`).
3. En la app: botón **Buscar actualizaciones** (arriba a la derecha). También chequea sola unos segundos después de abrir; si hay versión nueva, muestra un popup (Actualizar / Ahora no).

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
src/
  ingest/               PDF / EPUB / TXT → capítulos
  data/lexicon.ts       Léxico semilla + índice
  data/sampleChapter.ts Capítulo de demostración
  engine/               Detector, evaluador, sustitutor, pipeline
  hooks/useSpeech.ts    TTS del navegador
  components/           Lector, subida, audio, glosario, repaso
  App.tsx               Orquestación
SPEC.md                 Requisitos del producto
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
