# Plan de implementación: Talk with AI — conversación guiada en inglés

**Rama**: `002-talk-with-ai-replan` | **Fecha**: 2026-11-01 (actualizado tras `/speckit-clarify`) | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificación de la funcionalidad en `specs/002-talk-with-ai/spec.md`

**Naturaleza del plan**: retroactivo. El módulo ya está construido; este plan documenta la arquitectura y las decisiones reales del código actual, verificadas contra los archivos citados, y señala con honestidad dónde el código se aparta de la spec o de la constitución. No propone un rediseño.

**Actualización 2026-11-01** (tras la sesión de `/speckit-clarify`): FR-011 se alineó con el código (la pregunta final es opcional en el modo abierto), se agregó FR-020 (mensajes de micrófono, decidido pero **todavía no implementado**) y el límite de 20 mensajes quedó aceptado. Las discrepancias D2 y D5 se cerraron y D1 pasó de "brecha conocida" a requisito pendiente; el detalle está en la sección de discrepancias.

## Resumen

Módulo de conversación guiada en inglés con una IA, con dos modos servidos por **una sola pantalla**: "Talk with AI" (`/talk`, con el vocabulario guardado del estudiante, hasta 5 respuestas y retroalimentación) y "Open conversation" (`/talk/open`, tema libre del estudiante). El estudiante responde por voz (reconocimiento de voz del navegador) o escribiendo; la IA contesta con texto que se revela al ritmo del audio. Una sola ruta de servidor (`/api/talk`) concentra las tres acciones de IA (abrir, responder, dar retroalimentación); el audio pasa por la ruta compartida `/api/tts`; y todo se guarda por estudiante en tres tablas con RLS. Los dos cambios más recientes (desplazamiento automático y cuadro de respuesta más alto) son cambios solo de interfaz dentro de la misma pantalla.

## Contexto técnico

**Lenguaje/Versión**: TypeScript sobre Next.js 16 (App Router) + React 19 — el mismo stack del resto de la app.

**Dependencias principales**: `@anthropic-ai/sdk` (modelo Haiku 4.5, ya usado por las demás rutas de IA), Web Speech API del navegador (reconocimiento de voz), ElevenLabs vía la ruta compartida `/api/tts`, y el cliente de Supabase. No hay dependencias de runtime exclusivas de este módulo.

**Almacenamiento**: Supabase Postgres local (Principio IV). Tablas `personal_vocabulary`, `ai_conversations` y `ai_conversation_messages`, todas con RLS limitada al dueño. La retroalimentación no se guarda como tal; solo queda el mensaje de cierre de la IA dentro de la conversación.

**Pruebas**: Sin suite automatizada (no existe en el proyecto). Verificación manual según el Principio VI, guiada por [quickstart.md](./quickstart.md), más `npx tsc --noEmit` y ESLint.

**Plataforma objetivo**: Navegador web de escritorio y móvil sobre el stack local autoalojado. La voz depende del navegador (Chrome como referencia).

**Tipo de proyecto**: Aplicación web única (Next.js App Router); las rutas de servidor viven en `app/api/*` dentro del mismo proyecto.

**Objetivos de rendimiento**: No hay un objetivo medido de latencia de la IA. SC-002 (conversación completa en menos de 15 minutos) y SC-001 (primera respuesta en menos de 1 minuto) se verifican a mano.

**Restricciones**: Requiere conexión a internet para la IA, el audio y el reconocimiento de voz. Ningún secreto (`ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`) sale del servidor (Principio II). La IA ve como máximo los últimos 20 mensajes de la conversación (límite aceptado en la spec), cada uno recortado a 5000 caracteres, y hasta 10 palabras guardadas.

**Escala/Alcance**: Aplicación de uso personal con pocos usuarios concurrentes. El módulo no toca los escenarios ni Shadowing.

## Constitution Check

*GATE: debe pasar antes de la Fase 0. Se vuelve a evaluar después de la Fase 1.*

| Principio | Estado | Justificación |
|---|---|---|
| I. Contenido pensado para el estudiante | PASS | La IA ajusta la dificultad al nivel CEFR del estudiante y la retroalimentación es constructiva ("Encourage communication rather than correcting every mistake"). Es un módulo independiente como Shadowing, por lo que la secuencia de fases de un escenario no aplica. |
| II. Secretos solo en el servidor / una sola puerta por integración | PASS | Anthropic solo se llama desde `app/api/talk/route.ts` (ruta que el propio Principio II enumera); el audio pasa siempre por `/api/tts` con `{ text, speaker }`, y el módulo no contiene IDs de voz ni llaves. |
| III. Seguridad de los datos y RLS (NO NEGOCIABLE) | PASS | Las tres tablas tienen RLS activa y una política limitada al dueño, verificadas contra la base local (`pg_policies`); llegaron en migraciones incrementales (`20260720030000`, `20260720040000`). Este plan no agrega ni modifica datos. |
| IV. Local-first y privado | PASS | Sin dependencia de nube propia; solo los proveedores de IA y voz que ya usa el resto de la app. |
| V. Contratos de componentes estables | N/A | Talk no es una fase de escenario ni de capítulo: no usa el contrato `onComplete()` de `components/phases/*`. |
| VI. Verificado antes de terminar | ⚠ PENDIENTE | Los cambios recientes (desplazamiento automático y cuadro de 3 filas) pasaron `tsc` y ESLint pero **no se han ejercitado en la aplicación corriendo**, que es lo que exige el principio para cambios de interfaz. Se resuelve ejecutando los escenarios 4 y 5 de [quickstart.md](./quickstart.md); hasta entonces la funcionalidad no debe darse por terminada. Cuando se implemente FR-020, su comprobación (escenario 3) entra en la misma barrera. |

No hay violaciones de diseño que justificar. Tampoco las hay por FR-020: que el módulo aún no lo cumpla es una **brecha de implementación frente a la spec**, no una violación de un principio; se cierra con tareas (`/speckit-tasks`), no con este plan.

**Re-evaluación post-Fase 1**: el diseño documentado (`data-model.md`, `contracts/`, `quickstart.md`) no introduce dependencias nuevas ni datos nuevos. Los seis principios quedan igual que en la evaluación inicial.

### Discrepancias entre el código y la spec

**Abiertas** (siguen sin resolverse):

| # | Discrepancia | Evidencia | Qué conviene hacer |
|---|---|---|---|
| D1 | **FR-020 (mensajes de micrófono) está decidido y el módulo todavía no lo cumple**: si se deniega el permiso o no hay micrófono, no se muestra ningún mensaje. Pasó de "brecha conocida" a requisito pendiente de implementar. | `app/talk/page.tsx`: `startRecording` solo trata el caso de navegador sin voz; el reconocimiento no tiene manejador de errores (`onerror` solo aparece en el audio). El cuadro de respuesta no se deshabilita al grabar, así que escribir ya es posible. | Tarea de implementación (ver decisión en [research.md](./research.md) §6). |
| D3 | **El `/api/tts` de esta rama aún deja a la IA elegir el idioma** de textos cortos; las palabras sueltas ("escuchar una palabra guardada") a veces se pronuncian en español. El arreglo existe en la rama `001-shadow-implement` y no está fusionado. | `app/api/tts/route.ts` usa `eleven_multilingual_v2` sin `language_code`. | Fusionar esa rama; Talk se beneficia sin cambios propios. |
| D4 | **"Tema no repetido" se garantiza solo por título** (restricción de unicidad en base de datos), no por significado; dos títulos distintos pueden tratar lo mismo. | Migración: `unique (user_id, topic_key)` sobre el título normalizado. | Aceptable para SC-005 tal como está escrito; revisar si el usuario quiere algo más estricto. |

**Resueltas en la clarificación del 2026-11-01** (se conservan los identificadores para poder rastrearlas):

| # | Qué se discutió | Cómo se resolvió |
|---|---|---|
| D2 | FR-011 decía que cada turno termina con una pregunta, pero el modo abierto la deja opcional (`app/api/talk/route.ts`: "Ask a question only when it is genuinely useful"; el modo vocabulario sí exige una pregunta directa). | Se corrigió la **spec**: obligatoria en "Talk with AI", opcional en el modo abierto. El código ya se comportaba así; no hay cambio de código. |
| D5 | En una conversación larga la IA solo recuerda los últimos 20 mensajes (`.slice(-20)` en `respond` y `feedback`). | **Límite aceptado** y escrito en la spec (Casos límite y Supuestos). Se reabre con `/speckit-clarify` solo si el uso real demuestra que estorba. |

## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
specs/002-talk-with-ai/
├── plan.md              # Este archivo
├── research.md          # Salida de la Fase 0 (decisiones del código actual)
├── data-model.md        # Salida de la Fase 1
├── quickstart.md        # Salida de la Fase 1
├── contracts/
│   └── talk-api.md      # Contrato de /api/talk y uso de /api/tts
└── tasks.md             # Salida de /speckit-tasks (no se crea en este comando)
```

### Código fuente (raíz del repositorio)

```text
app/
├── talk/
│   ├── page.tsx                 # Pantalla única de ambos modos (el modo lo decide la ruta: /talk o /talk/open)
│   └── open/page.tsx            # Reexporta la pantalla anterior
├── api/
│   ├── talk/route.ts            # Única puerta de IA del módulo: acciones start / respond / feedback
│   ├── tts/route.ts             # Audio (ruta compartida con otros módulos)
│   └── vocabulary/translate/route.ts   # Significado en español de las palabras guardadas
└── dashboard/page.tsx           # Entrada al módulo: dos tarjetas (/talk y /talk/open)

components/
└── FloatingVocabulary.tsx       # Alta y estado de las palabras guardadas; avisa a la pantalla con un evento

supabase/migrations/
├── 20260720030000_add_talk_with_ai.sql              # Tablas, índices y RLS
└── 20260720040000_add_spanish_vocabulary_meanings.sql   # Columna spanish_meaning
```

**Decisión de estructura**: se sigue la convención del resto de la app (una pantalla por módulo bajo `app/<modulo>/` y una ruta de servidor por integración). Los dos modos comparten un único componente cliente de unas 900 líneas que contiene el estado, la voz, el audio y la presentación.

## Complexity Tracking

No hay violaciones de la constitución que justificar. Se anota un riesgo, no una violación:

| Observación | Por qué importa | Alternativa a considerar cuando el módulo cambie |
|---|---|---|
| Un solo componente cliente concentra todo el módulo (~900 líneas). | El usuario anticipa "muchos cambios" en Talk; cada cambio toca el mismo archivo y es fácil introducir regresiones. | Extraer componentes (lista de mensajes, barra de respuesta, panel de palabras, voz) al hacer el primer cambio grande, justificándolo en su plan. Hoy no se hace: sería un cambio no pedido. |
