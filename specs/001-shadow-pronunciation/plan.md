# Plan de implementación: Shadowing — práctica de pronunciación por repetición

**Rama**: `001-shadow-pronunciation` | **Fecha**: 2026-10-17 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificación de la funcionalidad en `specs/001-shadow-pronunciation/spec.md`

## Resumen

Nuevo módulo independiente ("Shadowing") que entrena la pronunciación del estudiante mediante shadowing:
el sistema genera una oración corta en inglés sobre un tema aleatorio acorde al nivel del estudiante, la
reproduce completa, y luego guía al estudiante palabra por palabra (reproducción + repetición + evaluación,
con hasta 3 intentos y opción de saltar), terminando con la repetición de la oración completa. El enfoque
técnico reutiliza en su totalidad los mecanismos ya existentes en la app — generación de contenido vía
Anthropic (como en Talk with AI), reconocimiento de voz del navegador y evaluación de habla completa (como
en `SpeakingPhase`/Talk with AI), y texto a voz vía `/api/tts` — y solo agrega una tabla nueva para el
historial de práctica (FR-014).

## Contexto técnico

**Lenguaje/Versión**: TypeScript sobre Next.js 16 (App Router) + React 19 — mismo stack que el resto de la
app; no se introduce ningún lenguaje o runtime nuevo.

**Dependencias principales**: `@anthropic-ai/sdk` (generación de oración + tema, reutilizando el patrón de
`/api/talk`), Web Speech API del navegador (reconocimiento de voz por palabra y de la oración completa, ya
usada en `SpeakingPhase`/Talk with AI), ElevenLabs vía la ruta existente `/api/tts` (reproducción de
palabras sueltas y de la oración completa). No se agrega ninguna dependencia de runtime nueva.

**Almacenamiento**: Supabase Postgres local (Principio IV). Nueva tabla `shadow_sessions` con RLS limitada
al dueño, para el historial de ejercicios completados (FR-014). El ejercicio en curso (oración, palabras,
intentos) vive solo en estado de cliente y no se persiste.

**Pruebas**: Sin suite automatizada (no existe en el proyecto). Verificación manual según el Principio VI:
`npx tsc --noEmit`, `npm run lint`, prueba manual en `npm run dev` contra Supabase local, y `npm run build`
si se tocan rutas o configuración.

**Plataforma objetivo**: Navegador web (escritorio y móvil) sobre el stack self-hosted local (Supabase
local; acceso remoto solo vía Tailscale), igual que el resto de la app.

**Tipo de proyecto**: Aplicación web única (Next.js App Router); no hay separación frontend/backend como
proyectos distintos. Las rutas de servidor viven en `app/api/*` dentro del mismo proyecto.

**Objetivos de rendimiento**: La reproducción de audio y el reconocimiento de voz por palabra deben
sentirse inmediatos, con la misma latencia ya aceptada en los demás módulos de habla. SC-001 exige que un
ejercicio completo tome menos de 5 minutos para una oración de hasta 14 palabras.

**Restricciones**: Requiere conexión a internet para Anthropic, ElevenLabs y el reconocimiento de voz del
navegador (igual que los módulos existentes; no es un requisito nuevo). Ningún secreto
(`ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, llaves de Supabase) puede exponerse en código de cliente
(Principio II).

**Escala/Alcance**: Aplicación de uso personal con pocos usuarios concurrentes (Principio IV). El módulo
agrega una pantalla nueva, una ruta de servidor nueva para generación de contenido, y una tabla nueva para
el historial — no se tocan los módulos de escenarios ni Talk with AI existentes.

## Constitution Check

*GATE: debe pasar antes de la Fase 0. Se vuelve a evaluar después de la Fase 1.*

| Principio | Estado | Justificación |
|---|---|---|
| I. Contenido pensado para el estudiante | PASS | Las oraciones se generan acordes al nivel CEFR del estudiante y el feedback (repetir palabra, saltar) es constructivo. Shadowing es un módulo independiente como Talk with AI, por lo que la secuencia de fases immersion→listening→comprehension→speaking→expression no aplica (igual que no aplica a Talk with AI). |
| II. Secretos solo en el servidor / una sola puerta por integración | PASS | La generación de oraciones llama a Anthropic solo desde una nueva ruta de servidor (`app/api/shadow/generate`); la síntesis de voz reutiliza `/api/tts` sin exponer IDs de voz ni llaves en el cliente. |
| III. Seguridad de datos y RLS (NO NEGOCIABLE) | PASS | El historial de práctica vive en una tabla nueva (`shadow_sessions`) con RLS limitada al dueño, migrada de forma incremental (nuevo archivo en `supabase/migrations/`); no se reinicia ninguna base con datos reales. |
| IV. Local-first y privado | PASS | No se introduce ninguna dependencia de nube; se apoya en el mismo Supabase local y el mismo acceso remoto vía Tailscale. |
| V. Contratos de componentes estables | N/A | Shadowing no es una fase de escenario (no usa el contrato `onComplete()` de `components/phases/*`); es un flujo independiente, como `app/talk/`. |
| VI. Verificado antes de terminar | PASS | El plan exige `tsc --noEmit`, `npm run lint`, prueba manual (`npm run dev`) y `npm run build` si se tocan rutas/config, antes de dar por terminada la funcionalidad. |

Sin violaciones de la constitución; no se requiere Complexity Tracking.

**Re-evaluación post-Fase 1**: el diseño resultante (`data-model.md`, `contracts/`, `quickstart.md`) no
introdujo ninguna dependencia externa nueva, mantiene Anthropic y ElevenLabs detrás de rutas de servidor
únicas, y aplica RLS a la única tabla nueva (`shadow_sessions`). Los seis principios se mantienen en el
mismo estado que en la evaluación inicial (PASS / N-A); no hay violaciones que registrar.

## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
specs/001-shadow-pronunciation/
├── plan.md              # Este archivo
├── research.md          # Salida de la Fase 0
├── data-model.md        # Salida de la Fase 1
├── quickstart.md        # Salida de la Fase 1
├── contracts/           # Salida de la Fase 1
└── tasks.md             # Salida de /speckit-tasks (no se crea en este comando)
```

### Código fuente (raíz del repositorio)

```text
app/
├── shadow/
│   └── page.tsx                      # Pantalla principal del módulo Shadowing
└── api/
    └── shadow/
        └── generate/
            └── route.ts              # Genera oración + tema vía Anthropic (nueva puerta de servidor)

components/
└── shadow/
    ├── ShadowSession.tsx             # Orquesta el flujo: oración → palabra por palabra → oración completa
    ├── WordRepeatStep.tsx            # Un paso de repetición de una palabra (TTS + reconocimiento + comparación)
    └── FinalSentenceStep.tsx         # Paso final de repetición de la oración completa (reutiliza el patrón de evaluate-speech)

supabase/
└── migrations/
    └── <timestamp>_add_shadow_sessions.sql   # Tabla shadow_sessions + políticas RLS
```

**Decisión de estructura**: se sigue la convención ya establecida por el resto de la app (Next.js App
Router con componentes por módulo bajo `components/<modulo>/`), sin introducir una separación
frontend/backend ni un proyecto nuevo — Shadowing es una pantalla más dentro de la misma aplicación Next.js,
igual que `app/talk/`.

## Complexity Tracking

No aplica — el Constitution Check no reportó violaciones que requieran justificación.
