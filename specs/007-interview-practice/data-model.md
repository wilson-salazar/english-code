# Modelo de datos: Módulo Interview

Migración nueva e incremental: `supabase/migrations/20261118000000_add_interview_practice.sql`. Solo crea tablas, índices y políticas; no modifica ni borra nada existente. Se aplica con `psql -v ON_ERROR_STOP=1 -f`, después de un `pg_dump` verificado (Principio III).

## `interview_cvs`

El CV de un estudiante. Uno por estudiante (FR-005).

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid` | Clave primaria, `gen_random_uuid()` |
| `user_id` | `uuid` | `not null`, `references public.users(id) on delete cascade`, `unique` |
| `content` | `text` | `not null`, `check (char_length(trim(content)) between 1 and 20000)` (FR-008) |
| `created_at` | `timestamptz` | `not null default now()` |
| `updated_at` | `timestamptz` | `not null default now()`; el cliente la envía al guardar |

Se guarda con `upsert` sobre `user_id`. No se guarda el archivo PDF (FR-007).

## `interviews`

Una práctica de entrevista.

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid` | Clave primaria, `gen_random_uuid()` |
| `user_id` | `uuid` | `not null`, `references public.users(id) on delete cascade` |
| `focus_title` | `text` | `not null`, `check (char_length(trim(focus_title)) between 1 and 200)`; el enfoque del CV elegido |
| `question_count` | `smallint` | `not null default 6`, `check (question_count between 1 and 10)` (FR-013) |
| `status` | `text` | `not null default 'in_progress'`, `check (status in ('in_progress', 'finished'))` |
| `feedback` | `jsonb` | Nulo hasta la retroalimentación ([contracts/interview.md](./contracts/interview.md)) |
| `created_at` | `timestamptz` | `not null default now()` |
| `finished_at` | `timestamptz` | Nulo hasta terminar |

Índice: `(user_id, created_at desc)`, para leer los 5 enfoques recientes (FR-015).

### Estados

```text
in_progress ── retroalimentación recibida ──→ finished
     │
     └── recarga o salida ──→ queda en in_progress, en el historial; no se retoma (como Talk en 006)
```

## `interview_turns`

Una pregunta de la reclutadora o una respuesta del estudiante, en orden.

| Columna | Tipo | Regla |
|---|---|---|
| `id` | `uuid` | Clave primaria, `gen_random_uuid()` |
| `interview_id` | `uuid` | `not null`, `references public.interviews(id) on delete cascade` |
| `role` | `text` | `not null`, `check (role in ('recruiter', 'candidate'))` |
| `content` | `text` | `not null`, `check (char_length(trim(content)) between 1 and 5000)` |
| `question_type` | `text` | Nulo en las respuestas; en las preguntas, uno de `opening`, `cv_experience`, `qa_concepts`, `automation`, `situational`, `practical`, `closing` (FR-014) |
| `created_at` | `timestamptz` | `not null default now()` |

Índice: `(interview_id, created_at)`.

## RLS

Las tres tablas tienen RLS activa, con una política `for all to authenticated`:

- `interview_cvs` e `interviews`: la fila pertenece al estudiante si `exists (select 1 from public.users u where u.id = <tabla>.user_id and u.auth_user_id = (select auth.uid()))`, en `using` y `with check`. Es la misma forma que `shadow_sessions`.
- `interview_turns`: a través de su entrevista: `exists (select 1 from public.interviews i join public.users u on u.id = i.user_id where i.id = interview_turns.interview_id and u.auth_user_id = (select auth.uid()))`. Es la misma forma que `ai_conversation_messages`.

## Validaciones en la aplicación

- El PDF: firma `%PDF`, como máximo 5 MB, con texto legible.
- El CV: entre 1 y 20.000 caracteres tras quitar espacios al inicio y al final; por encima, se avisa y no se guarda.
- Las respuestas: no vacías, como máximo 5.000 caracteres.
