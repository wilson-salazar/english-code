# Modelo de datos — Shadow (práctica de pronunciación)

## Entidades persistidas (Supabase)

### `shadow_sessions` (Historial de práctica de Shadow — FR-014)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | `default gen_random_uuid()` |
| `user_id` | uuid, FK → `public.users(id)` | Dueño del registro; mismo patrón que `user_chapter_progress`/`ai_conversations` (no es `auth.users` directo) |
| `sentence` | text | Oración practicada |
| `topic_category` | text | Tema/categoría asignado por la generación (p. ej. "technology", "psychology") |
| `level` | text | Código de nivel CEFR del estudiante al momento del ejercicio (A2–C1) |
| `completed_at` | timestamptz | Momento en que se terminó el paso final (oración completa) |
| `created_at` | timestamptz | `default now()` |

**Reglas de validación** (de los requisitos):
- Un renglón se crea únicamente cuando el ejercicio se marca como terminado (FR-011), nunca para intentos
  parciales o abandonados (ver Supuestos del spec).
- `sentence` no puede estar vacío; `level` debe corresponder a uno de los niveles CEFR ya soportados por la
  app (A2–C1).

**RLS (Principio III, NO NEGOCIABLE)**:
- `select`, `insert`, `update`, `delete` solo donde exista un `public.users` con `id = shadow_sessions.user_id`
  y `auth_user_id = auth.uid()` (mismo patrón exacto que `user_chapter_progress`/`ai_conversations`).
- Sin excepciones de service-role en código de cliente.

**Migración**: archivo nuevo y aditivo en `supabase/migrations/` (no modifica tablas existentes).

## Entidades en memoria de cliente (no persistidas)

### `ShadowExercise` (ejercicio en curso)

| Campo | Tipo | Notas |
|---|---|---|
| `sentence` | string | Oración objetivo completa |
| `words` | string[] | Palabras de la oración, en orden, derivadas de `sentence` |
| `topicCategory` | string | Tema devuelto por la generación |
| `level` | string | Nivel CEFR usado para generar la oración |

No se persiste: si el estudiante recarga la página a mitad del ejercicio, se reinicia (ver Supuestos del
spec).

### `WordAttempt` (intento de palabra)

| Campo | Tipo | Notas |
|---|---|---|
| `word` | string | Palabra objetivo de este paso |
| `recognizedText` | string \| null | Lo que el reconocimiento de voz entendió, o `null` si no detectó habla |
| `accepted` | boolean | Resultado de la comparación normalizada (ver research.md §1) |
| `attemptNumber` | number | 1 a 3 (FR-007) |
| `skipped` | boolean | `true` si se usó la opción de saltar tras agotar los 3 intentos (FR-008) |

**Transiciones de estado** (por palabra):

```text
idle → escuchando → evaluado
  evaluado(aceptado=true)              → avanza a la siguiente palabra (o al paso final si era la última)
  evaluado(aceptado=false, intentos<3) → vuelve a "escuchando" (la IA repite la palabra)
  evaluado(aceptado=false, intentos=3) → ofrece "saltar" / "oír más despacio"
    saltar      → avanza a la siguiente palabra (marcado skipped=true)
    oír despacio → vuelve a "escuchando" sin consumir un intento adicional del límite mostrado al estudiante
```

## Relación entre entidades

Un `ShadowExercise` contiene una lista ordenada de `WordAttempt` (uno o más por palabra, según reintentos).
Al completarse el paso final de la oración completa, se persiste un único `shadow_sessions` por ejercicio
— los `WordAttempt` individuales nunca se persisten (son detalle transitorio de UI, no historial).
