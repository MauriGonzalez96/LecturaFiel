# Plan: capítulos, resúmenes IA y lectura

Objetivo: que al subir un libro se parta bien en capítulos, se puedan resumir uno a uno o en lote, y se pueda escuchar / exportar el mapa del libro.

Estado actual (v0.3.10):
- Ingestión heurística (PDF / EPUB / TXT) → `chapters[]`
- Resumen IA **por capítulo activo** + caché IDB (`bookId:chapterIndex:hash`)
- UI: lista de capítulos en Resumen IA, badges ✓, sin salir del tab al cambiar capítulo

---

## Principios

1. **Heurística primero, IA como refuerzo** — no gastar API si el TOC/encabezados ya alcanzan.
2. **Capítulo = unidad de resumen y de audio** — misma lista en Lectura y Resumen IA.
3. **Caché por hash de texto** — si el usuario reagrupa capítulos, se invalidan solos.
4. **Sin login Lectura Fiel** — keys locales (Gemini / OpenAI / Ollama).
5. **Cancelable y reanudable** — colas largas no bloquean la UI.

---

## Fase 0 — Base ✅

| Ítem | Notas |
|------|--------|
| Lista de capítulos en Resumen IA | Hecho |
| Resumen on-demand + ✓ | Hecho |
| `listSummariesForBook` | Hecho |
| Tras subir → tab IA | Hecho |
| Aviso de calidad de corte | Banner en Resumen IA si `splitConfidence === 'low'` |

**Salida:** mensaje claro cuando la detección es floja.

---

## Fase 1 — Cola: resumir todo el libro ✅

**Estado:** implementada (cola secuencial + UI + tests).

### Hecho
- `src/ai/summarizeBookQueue.ts` — cola, skip caché, cancel, backoff 429
- `src/hooks/useBookSummaryQueue.ts`
- UI en `ChapterSummaryPanel`: Resumir todos / saltar existentes / progreso / cancelar
- Tests: `summarizeBookQueue.test.ts`

### Riesgos restantes
- Cuotas agresivas de Gemini en libros muy largos
- Capítulos enormes → chunking existente en `summarizeChapter`

**Salida:** un libro completo resumible sin clickear capítulo a capítulo.

---

## Fase 2 — Mapa del libro + export ✅

**Estado:** implementada.

### Hecho
- `src/ai/exportBookSummaries.ts` — mapa + Markdown + download
- `src/hooks/useBookSummaryMap.ts`
- UI: toggle Lista / Mapa, excerpts, **Descargar .md**
- Contador en chrome ya desde Fase 1: `Resumen IA (n/m)`
- Tests: `exportBookSummaries.test.ts`

**Salida:** leer la estructura del libro y exportar resúmenes.

---

## Fase 3 — Resumen acumulado (“hasta acá”) ✅

**Estado:** implementada.

### Hecho
- `summarizeProgressSoFar` + caché `progress:bookId:upTo:hash`
- UI en Resumen IA: generar / escuchar progreso
- Tests: `summarizeProgress.test.ts`

**Salida:** “dónde voy en el libro” en 1–2 minutos de audio.

---

## Fase 4 — Edición manual de cortes ✅

**Estado:** implementada.

### Hecho
- `src/ingest/editChapters.ts` — renombrar, unir, partir, restablecer
- `sourceChapters` en `IngestedBook` + `library.updateBookChapters`
- UI `ChapterSplitEditor` desde Resumen IA (banner o botón)
- Tests: `editChapters.test.ts`

**Salida:** el usuario corrige PDFs mal partidos sin re-subir.

---

## Fase 5 — Detección de capítulos con IA ✅

**Estado:** implementada.

### Hecho
- `src/ingest/needsAiSplit.ts` — cuándo conviene IA
- `src/ai/detectChapters.ts` — muestras + JSON + corte local
- UI `AiSplitProposal`: antes/después, aceptar/descartar
- Botón en Resumen IA (destacado si partición débil)
- Tests: `detectChapters.test.ts`, `needsAiSplit.test.ts`

**Salida:** PDFs/TXT mal partidos se pueden reproponer con un pedido a la IA.

---

## Fase 6 — Lectura / audio alrededor de resúmenes ✅

**Estado:** implementada (MVP).

### Hecho
- Checkbox **Encadenar resúmenes** en el player
- Espera el resumen del capítulo nuevo (no reproduce el anterior)
- Si falta resumen, **lo genera on-the-fly** y luego lo reproduce; si falla, salta
- Marca **escuchado** (localStorage) en lista/mapa

---

## Fase 7 — Heurística más fuerte (sin IA) ✅

**Estado:** implementada.

### Hecho
- `splitConfidence` en `ParsedBook` + `assessSplitConfidence`
- TXT/MD: encabezados clásicos + fallback markdown / `1.` / `LIBRO`
- PDF: más patrones (`libro`, `sección`, `1. Título`) + flag `usedPageChunks`
- EPUB: títulos desde `nav` / `toc.ncx` cuando existen
- Tests: `textCleanup.test.ts`, `splitConfidence.test.ts`

**Salida:** menos dependencia de API para libros bien tipografiados.

---

## Orden de implementación recomendado

```text
Fase 0  banner calidad
   ↓
Fase 1  cola “resumir todos”     ← empezar aquí
   ↓
Fase 2  mapa + export .md
   ↓
Fase 7  heurística (en paralelo cuando haya hueco)
   ↓
Fase 4  editar cortes a mano
   ↓
Fase 5  detección con IA
   ↓
Fase 3  resumen acumulado
   ↓
Fase 6  auto-avance audio / escuchado
```

Justificación: 1→2 dan producto usable ya; 4→5 mejoran el input; 3 y 6 son “nice” sobre resúmenes existentes.

---

## Criterios de hecho (por fase)

- **1:** Resumir libro de ≥5 capítulos, cancelar a mitad, reanudar saltando existentes
- **2:** Descargar `.md` con todos los resúmenes listos; mapa navegable
- **3:** “Hasta cap. K” coherente y cacheado
- **4:** Unir/partir y que Lectura + IA usen la nueva lista
- **5:** PDF sin encabezados → partición aceptada por el usuario en ≤2 intentos de modelo
- **6:** Escuchar resúmenes en cadena sin tocar la UI
- **7:** Menos libros con `splitConfidence: 'low'` en corpus de prueba interno

---

## Fuera de alcance (por ahora)

- Sync en la nube / cuenta Lectura Fiel
- Chat libre “preguntá al capítulo” (mockup) — otro epic
- Export Anki/Obsidian masivo
- Reescritura del libro completo por IA (solo cortes + resúmenes)

---

## Estado del epic

Fases **0–7** implementadas. Fase 6 incluye generación on-the-fly al encadenar si falta el resumen.
