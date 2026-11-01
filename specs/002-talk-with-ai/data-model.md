# Modelo de datos — Talk with AI

Describe las tablas **que ya existen** (migraciones `20260720030000_add_talk_with_ai.sql` y `20260720040000_add_spanish_vocabulary_meanings.sql`). Este plan no agrega ni modifica datos. Todas las tablas viven en el esquema `public` y dependen de `public.users` (el perfil del estudiante), no de `auth.users` directamente.

## Relaciones

```text
users (perfil)
 ├── 1 ── N  personal_vocabulary
 └── 1 ── N  ai_conversations
                └── 1 ── N  ai_conversation_messages
```

El borrado es en cascada: si se elimina un perfil, desaparecen sus palabras y conversaciones; si se elimina una conversación, desaparecen sus mensajes.

## `personal_vocabulary` — Palabra guardada (spec: Entidad "Palabra guardada")

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | `gen_random_uuid()` |
| `user_id` | uuid, no nulo | FK a `users(id)`, cascada |
| `term` | text, no nulo | Entre 1 y 120 caracteres (sin contar espacios de los extremos) |
| `normalized_term` | text, generado | Minúsculas y espacios colapsados; **único por estudiante** (`user_id`, `normalized_term`): impide duplicados |
| `is_learned` | boolean, no nulo | Por defecto `false`. Estado: pendiente → aprendida |
| `learned_at` | timestamptz | Se llena al marcar como aprendida |
| `created_at` | timestamptz, no nulo | Por defecto `now()` |
| `spanish_meaning` | text | Significado corto en español, generado una vez (migración 2); puede ser nulo mientras se traduce |

**Índice**: `personal_vocabulary_active_idx` sobre (`user_id`, `created_at`) para las no aprendidas.

**Cómo lo usa el módulo**: lee hasta 10 palabras con `is_learned = false`, de la más antigua a la más reciente (FR-002); marca una como aprendida con `is_learned = true` y `learned_at` (FR-005). El alta de palabras la hace el widget de vocabulario, no este módulo.

**Transición de estado**: `pendiente` → `aprendida`. En el módulo no hay camino de vuelta.

## `ai_conversations` — Conversación (spec: Entidad "Conversación")

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, no nulo | FK a `users(id)`, cascada |
| `topic_title` | text, no nulo | Entre 1 y 160 caracteres. En el modo abierto es `Open conversation <fecha ISO>` |
| `topic_key` | text, generado | Título en minúsculas con todo lo que no sea alfanumérico convertido en guiones |
| `topic_category` | text, no nulo | Categoría amplia; en el modo abierto, `Open conversation` |
| `vocabulary_terms` | text[], no nulo | Palabras que se practicaron; vacío en el modo abierto |
| `created_at` | timestamptz, no nulo | |

**Restricción**: `unique (user_id, topic_key)` — garantiza FR-016 y SC-005 en cuanto al **título** (discrepancia D4: no detecta temas parecidos con otro título).

**Índice**: `ai_conversations_user_created_idx` sobre (`user_id`, `created_at` descendente).

**Nota**: no hay una columna de "modo" ni de "estado"; el modo se deduce de la categoría y las palabras, y una conversación sin retroalimentación simplemente queda con menos mensajes.

## `ai_conversation_messages` — Mensaje (spec: Entidad "Mensaje")

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid, PK | |
| `conversation_id` | uuid, no nulo | FK a `ai_conversations(id)`, cascada |
| `role` | text, no nulo | Solo `assistant` o `user` |
| `content` | text, no nulo | Entre 1 y 5000 caracteres (origen del límite de la spec) |
| `created_at` | timestamptz, no nulo | Define el orden de la conversación |

**Índice**: `ai_conversation_messages_conversation_created_idx` sobre (`conversation_id`, `created_at`).

**Contenido de una conversación**: abre la IA (solo modo vocabulario), alternan estudiante e IA, y al pedir retroalimentación se guarda un último mensaje de la IA (el cierre).

## Retroalimentación (spec: Entidad "Retroalimentación")

**No se persiste.** Se genera al terminar y se muestra en pantalla (resumen, fortalezas, mejoras, siguiente paso); lo único que se guarda es el mensaje de cierre de la IA como un mensaje más.

## Seguridad (Principio III)

RLS activa en las tres tablas, con una política `for all` para el rol `authenticated`:

| Tabla | Política | Regla |
|---|---|---|
| `personal_vocabulary` | Users manage their personal vocabulary | Existe un `users` con `id = user_id` y `auth_user_id = auth.uid()` |
| `ai_conversations` | Users manage their AI conversations | Igual, sobre `user_id` |
| `ai_conversation_messages` | Users manage messages in their AI conversations | La conversación del mensaje pertenece a un `users` con `auth_user_id = auth.uid()` |

Verificado contra la base local (`pg_policies` y `relrowsecurity`) el 2026-11-01. Respalda SC-008.

## Datos que el módulo no guarda

Nivel CEFR (se lee del perfil en cada visita; `B1` por defecto), lo que el estudiante estaba escribiendo y el estado de una conversación en curso: al recargar se empieza otra.
