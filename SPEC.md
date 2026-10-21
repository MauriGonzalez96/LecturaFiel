# Lectura Fiel — especificación

## Principio central

**Simplificación léxica selectiva:** el sistema debe preservar la redacción original del libro y evitar sustituciones de vocabulario habitual, literario o formal que no sean necesarias. Solo debe considerar la sustitución de términos arcaicos, muy poco frecuentes, excesivamente cultos o potencialmente difíciles para un lector general. Cada sustitución debe conservar el significado contextual y realizar el mínimo cambio posible. Las palabras originales sustituidas deben incorporarse al glosario del capítulo, junto con su definición y el contexto en el que aparecen. Cuando no exista una alternativa suficientemente precisa, la palabra debe mantenerse y explicarse en el glosario.

La prioridad es la **rareza o dificultad** del vocabulario, no la longitud ni la formalidad.

## Categorías

| Categoría | Ejemplos | Comportamiento |
| --- | --- | --- |
| Cotidiano | camino, ventana | No modificar |
| Literario habitual | melancolía, cristalino, desolación | No modificar |
| Formal vigente | deplorable, considerable | No modificar (salvo excepciones) |
| Culto / arcaico / poco frecuente | sofisma, hogaño, empero, inmarcesible | Evaluar → sustituir o glosario |

## Umbral de intervención

- **Nivel 0:** habitual → nada
- **Nivel 1:** literario/formal vigente → conservar
- **Nivel 2:** poco frecuente → evaluar
- **Nivel 3:** arcaico / muy culto / difícil → considerar sustitución

Solo los niveles 2 y 3 pasan a evaluación contextual. La sustitución no es automática: hace falta una alternativa adecuada.

## Pipeline (3 etapas)

1. **Detectar** candidatas (léxico semilla N2–N3 + rareza por vocabulario frecuente de referencia; las de rareza van a glosario sin sustituir).
2. **Evaluar** si hace falta sustituir (contexto local + caché por lema y palabra previa).
3. **Sustituir** lo mínimo; construir glosario.

## Glosario

Dos tipos de entrada:

- **Palabra sustituida:** reemplazada en el texto/audio + definición + expresión usada.
- **Palabra difícil conservada:** se mantiene en el audio, pero se explica.

Campos: palabra, significado, expresión en el audio (si aplica), frase original, capítulo.

## Postura del producto

Conservador por defecto. Objetivo: un audiolibro fiel al original, con vocabulario excepcionalmente difícil adaptado y un glosario para aprenderlo.
