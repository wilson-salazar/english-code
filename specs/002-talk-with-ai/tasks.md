# Tareas: Talk with AI — conversación guiada en inglés

**Entrada**: Documentos de diseño en `/specs/002-talk-with-ai/`

**Prerrequisitos**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes)

**Naturaleza del documento**: retroactivo. El módulo ya está construido, así que este archivo es ante todo un **mapa de trazabilidad** entre la spec y el código actual. Las tareas marcadas `[X]` se verificaron leyendo el código vigente el 2026-11-01 (se cita archivo y función); `/speckit-converge` las volverá a comprobar, porque una casilla marcada no es evidencia por sí sola. Las tareas abiertas `[ ]` son lo único que falta de verdad.

**Pruebas**: la spec no pidió una suite automatizada (el proyecto no tiene una, Principio VI); no se generan tareas de prueba automatizada. La verificación es manual, con [quickstart.md](./quickstart.md), más `npx tsc --noEmit` y ESLint.

**Organización**: las tareas se agrupan por historia de usuario para poder implementarlas y probarlas de forma independiente.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: se puede hacer en paralelo (archivo distinto o verificación independiente, sin dependencias pendientes)
- **[Story]**: a qué historia de usuario pertenece (US1 a US4)

## Convenciones de ruta

Next.js 16 App Router, un solo proyecto; rutas relativas a la raíz del repositorio, según [plan.md](./plan.md). Los números de línea no se citan porque cambian con cada edición; se cita la función o el elemento.

---

## Fase 1: Setup (esquema y datos — ya existen)

**Propósito**: tablas y restricciones que el módulo necesita. Aplicadas de forma incremental, nunca con `supabase db reset` (Principio III).

- [X] T001 [P] Tablas `personal_vocabulary`, `ai_conversations` y `ai_conversation_messages` en `supabase/migrations/20260720030000_add_talk_with_ai.sql`, con RLS activa y una política `for all to authenticated` por tabla limitada al dueño (verificadas en `pg_policies`). Restricciones tal como están en la migración: `term text not null check (char_length(trim(term)) between 1 and 120)`, `unique (user_id, normalized_term)`, `topic_title text not null check (char_length(trim(topic_title)) between 1 and 160)`, `unique (user_id, topic_key)`, `role text not null check (role in ('assistant', 'user'))`, `content text not null check (char_length(trim(content)) between 1 and 5000)`; índices `personal_vocabulary_active_idx`, `ai_conversations_user_created_idx` y `ai_conversation_messages_conversation_created_idx` (FR-016, SC-005, SC-008).
- [X] T002 [P] Columna `spanish_meaning text` en `personal_vocabulary` mediante `supabase/migrations/20260720040000_add_spanish_vocabulary_meanings.sql`, que alimenta el panel de palabras (FR-004).

---

## Fase 2: Foundational (bloqueante para todas las historias)

**Propósito**: la puerta de IA, la pantalla única y la entrada desde el dashboard.

- [X] T003 `POST /api/talk` en `app/api/talk/route.ts` con las acciones `start`, `respond` y `feedback`; la llave `ANTHROPIC_API_KEY` solo se lee en el servidor y, si falta, responde 503; límites de entrada: hasta 10 palabras, últimos 80 temas previos, últimos 20 mensajes de 5000 caracteres, `level` por defecto `B1` (contrato [talk-api.md](./contracts/talk-api.md), Principio II).
- [X] T004 Prompt del sistema en `app/api/talk/route.ts` (constante `system` y la instrucción por modo de `respond`): solo inglés, nivel CEFR del estudiante, turnos de 45 a 90 palabras, contexto para el vocabulario desconocido sin traducir todo; la pregunta final es obligatoria en el modo vocabulario ("direct question") y opcional en el modo abierto ("only when it is genuinely useful") (FR-011).
- [X] T005 Pantalla única `app/talk/page.tsx` (`TalkWithAiPage`) cuyo modo lo decide la ruta (`pathname === '/talk/open'`); `app/talk/open/page.tsx` la reexporta; las dos tarjetas de `app/dashboard/page.tsx` ("Practice vocabulary →" lleva a `/talk` y "Start open conversation →" a `/talk/open`) (FR-001, FR-008).
- [X] T006 Inicialización en el efecto `initializeTalk` de `app/talk/page.tsx`: lee la sesión y el perfil, toma el nivel CEFR (`B1` si no hay), y redirige a `/` si no hay sesión o perfil.

**Checkpoint**: la base está lista; las historias se pueden verificar de forma independiente.

---

## Fase 3: Historia de usuario 1 - Practicar con mi vocabulario en una conversación guiada (Prioridad: P1) 🎯 MVP

**Meta**: tema nuevo → conversación con las palabras guardadas → hasta 5 respuestas → retroalimentación.

**Prueba independiente**: Escenario 1 de [quickstart.md](./quickstart.md).

- [X] T007 [US1] Carga del vocabulario en `loadActiveTerms` de `app/talk/page.tsx`: hasta 10 palabras con `is_learned = false`, ordenadas por `created_at`, con `spanish_meaning` y un respaldo si esa columna no existe (FR-002).
- [X] T008 [US1] Apertura del tema en `startConversation` de `app/talk/page.tsx`: lee los títulos de las conversaciones del estudiante como `previousTopics`, llama `action: 'start'`, guarda la conversación y el mensaje de apertura, y reintenta si la base rechaza el título repetido (código `23505`); si vuelve a fallar muestra "The AI repeated a previous topic" (FR-001, SC-005).
- [X] T009 [US1] Uso e identificación de las palabras: la instrucción `vocabularyInstruction` de `app/api/talk/route.ts` (cada término al menos una vez en los primeros cuatro turnos; sin palabras, conversación útil e invitación a agregarlas), la función `highlightedText` y el panel "Words in this conversation" de `app/talk/page.tsx` (FR-002, FR-003, FR-004, SC-004).
- [X] T010 [US1] `markTermLearned` en `app/talk/page.tsx`: pone `is_learned = true` y `learned_at`, quita la palabra del panel y avisa al widget con `PERSONAL_VOCABULARY_EVENT` (FR-005).
- [X] T011 [US1] Envío y avance en `sendMessage` y `requestAssistantResponse` de `app/talk/page.tsx`: guarda cada mensaje, muestra "Response N of 5" (`MAX_USER_TURNS = 5`) y, al enviar la quinta en este modo, llama a `requestFeedback` sola (FR-006).
- [X] T012 [US1] Terminar antes en `finishConversation` de `app/talk/page.tsx`; el botón "Finish & feedback" aparece cuando `userTurnCount >= (isOpenMode ? 1 : 2)`, es decir, desde la segunda respuesta en este modo (FR-007).
- [X] T013 [US1] Retroalimentación en `requestFeedback` de `app/talk/page.tsx` y la acción `feedback` de `app/api/talk/route.ts` (resumen, fortalezas, mejoras y siguiente paso; se rechaza una respuesta incompleta); guarda el mensaje de cierre, lo reproduce y muestra la tarjeta "Your feedback" (FR-009).
- [X] T014 [US1] Tema nuevo en `handleNewTopic` y en el botón "New topic" del encabezado y el "New topic →" que reemplaza la barra de respuesta al terminar, en `app/talk/page.tsx`; el del encabezado se deshabilita mientras la IA carga o piensa (FR-010).

**Checkpoint**: la Historia 1 funciona de forma independiente (MVP).

---

## Fase 4: Historia de usuario 2 - Conversar libremente sobre un tema propio (Prioridad: P2)

**Meta**: el estudiante abre con cualquier tema, sin vocabulario impuesto y sin tope de respuestas.

**Prueba independiente**: Escenario 2 de [quickstart.md](./quickstart.md).

- [X] T015 [US2] Inicio del modo abierto en `startOpenConversation` de `app/talk/page.tsx` (no llama a la IA, vacía la lista de palabras) y creación de la conversación al primer envío dentro de `sendMessage`, con `topic_title` = `Open conversation <fecha ISO>`, `topic_category` = `Open conversation` y `vocabulary_terms` vacío (FR-008).
- [X] T016 [US2] Respuestas del modo abierto: `respond` con `mode: 'open'` en `app/api/talk/route.ts` (no usa ni menciona el vocabulario, responde al tema del estudiante sin redirigirlo, la pregunta es opcional) y sin tope de respuestas en `sendMessage` (solo el modo vocabulario compara con `MAX_USER_TURNS`) (FR-008, FR-011).
- [X] T017 [US2] "New conversation" y "New conversation →" en `app/talk/page.tsx` (`handleNewTopic` llama a `startOpenConversation` en este modo) (FR-010).

**Checkpoint**: las Historias 1 y 2 funcionan juntas.

---

## Fase 5: Historia de usuario 3 - Responder hablando o escribiendo (Prioridad: P2)

**Meta**: responder por voz o texto, corregir antes de enviar, un cuadro cómodo y mensajes claros si el micrófono falla.

**Prueba independiente**: Escenarios 3 y 4 de [quickstart.md](./quickstart.md).

- [X] T018 [US3] Entrada por voz y por texto en `startRecording`, `stopRecording` y `retryRecording` de `app/talk/page.tsx`: el texto reconocido va al `<textarea>` controlado por `transcript`, se puede editar, borrar ("Clear") o volver a grabar ("Record again"), y `sendMessage` solo envía lo que quedó en el cuadro (FR-012).
- [X] T019 [US3] Navegador sin reconocimiento de voz: `startRecording` de `app/talk/page.tsx` activa `speechUnsupported` y la barra de respuesta muestra "Voice recognition is unavailable in this browser. You can still type your answer." (FR-013).
- [X] T020 [US3] Cuadro de respuesta de 3 filas: `rows={3}` en el `<textarea>` de `app/talk/page.tsx` (antes `rows={2}`), sin deshabilitarse al grabar (FR-019, SC-007). Implementado; su comprobación en pantalla es T023.
- [X] T021 [US3] Implementar FR-020 en `startRecording` de `app/talk/page.tsx` siguiendo la decisión de diseño de [research.md](./research.md) §6: manejar el evento de error del reconocimiento de voz; con `not-allowed` o `service-not-allowed` mostrar "Microphone access was denied. Please allow microphone access and try again."; con `audio-capture` mostrar "No microphone was found. Connect one and try again."; mostrar el mensaje como alerta accesible en la zona donde hoy aparece el aviso de voz no disponible; en ambos casos volver el estado de grabación a reposo (no a "review"), no enviar nada y dejar el cuadro de respuesta disponible para escribir. Reutilizar los textos y el patrón de T025 de Shadowing (`components/shadow/WordRepeatStep.tsx`, rama `001-shadow-implement`) (FR-020, Historia 3 escenario 5).
- [X] T022 [P] [US3] Verificar FR-020 (`app/talk/page.tsx`) en la aplicación corriendo: Escenario 3, pasos 4 y 5 de [quickstart.md](./quickstart.md) (permiso denegado y sin micrófono). Incluye confirmar que lo que el estudiante había escrito no se pierde. El usuario probó los dos casos y funcionan.
- [X] T023 [P] [US3] Verificar en la aplicación corriendo (`app/talk/page.tsx`) el Escenario 4 de [quickstart.md](./quickstart.md): el cuadro muestra 3 líneas a la vez, no crece al escribir, hace scroll por dentro y la barra inferior no tapa el último mensaje (FR-019, SC-007, Principio VI).

**Checkpoint**: la Historia 3 está completa cuando T021, T022 y T023 estén hechas.

---

## Fase 6: Historia de usuario 4 - Escuchar a la IA y seguir la conversación sin perder el hilo (Prioridad: P3)

**Meta**: oír cada mensaje mientras se lee y que la pantalla siga siempre lo último sin quitarle el control al estudiante.

**Prueba independiente**: Escenario 5 de [quickstart.md](./quickstart.md).

- [X] T024 [US4] Audio de la IA en `speakAssistant` y `skipAssistantAudio` de `app/talk/page.tsx`: pide el audio a `/api/tts` con `{ text, speaker: 'female' }`, revela el texto según el progreso de la reproducción, corta a los 45 segundos y, si el audio o la petición fallan, escribe el texto igualmente con `typeText` (FR-014).
- [X] T025 [US4] Repetir y escuchar en `app/talk/page.tsx`: botón "Replay AI message" en cada mensaje de la IA, "Listen to topic title" en el título del tema y el botón de pronunciación de cada palabra del panel, más "Skip audio →" mientras suena (FR-014, SC-003).
- [X] T026 [US4] Desplazamiento automático en los efectos de `app/talk/page.tsx`: el oyente de `scroll` mantiene `stickToBottomRef` (activo a menos de 160 px del final), el efecto sobre `messages`, `visibleAssistantText`, `speakingMessageId`, `sending`, `loadingTopic`, `error` y `feedback` llama a `window.scrollTo` (instantáneo mientras la IA habla, suave en el resto) salvo que `feedback` exista o el estudiante haya subido; `sendMessage` reactiva `stickToBottomRef`; el efecto de `feedback` centra la tarjeta; el relleno inferior `pb-56` de `<main>` deja la última línea sobre la barra fija (FR-017, FR-018).
- [X] T027 [P] [US4] Verificar en la aplicación corriendo (`app/talk/page.tsx`) el Escenario 5 de [quickstart.md](./quickstart.md): la pantalla baja sola con el texto que se escribe, con "AI is thinking..." y con un error; no arrastra al estudiante si subió a releer; vuelve a seguir al enviar; y la tarjeta de retroalimentación se centra sin pelearse con el seguimiento (FR-017, FR-018, SC-006, Principio VI).

**Checkpoint**: las cuatro historias funcionan de forma independiente.

---

## Fase final: Transversal y cierre

**Propósito**: fallos, persistencia y barreras de calidad que afectan a varias historias.

- [X] T028 Fallos y reintento en `requestAssistantResponse`, `retryAssistantResponse` y `requestFeedback` de `app/talk/page.tsx`: si la IA falla o no se puede guardar su respuesta, se conserva la respuesta del estudiante en `pendingHistory` y aparece "Retry AI response"; si falla la retroalimentación o guardar un mensaje se muestra un error claro y se puede volver a intentar (FR-015).
- [X] T029 Persistencia y privacidad: cada conversación y cada mensaje se insertan por estudiante (`startConversation`, `sendMessage`, `requestAssistantResponse`, `requestFeedback` de `app/talk/page.tsx`) y las tres tablas tienen RLS activa con su política de dueño, comprobada en `pg_policies` (FR-016, SC-008).
- [X] T030 Tras T021, ejecutar `npx tsc --noEmit` y `npx eslint app/talk` sin errores en `app/talk/page.tsx` (Principio VI).
- [X] T031 [P] Corregir la nota al pie de `specs/002-talk-with-ai/checklists/requirements.md`, que todavía dice que el micrófono es una "mejora futura, no un requisito pendiente" y contradice a FR-020 (solo documentación; el comando `/speckit-clarify` no puede editarla).

---

## Dependencias y orden de ejecución

### Dependencias por fase

- **Setup y Foundational (Fases 1 y 2)**: ya construidas.
- **Historias 1 a 4 (Fases 3 a 6)**: construidas; solo quedan tareas abiertas en las Historias 3 y 4.
- **Cierre (fase final)**: T030 depende de T021.

### Orden de las tareas abiertas

1. **T021** (código de FR-020) → **T022** y **T030** (verificar y comprobar tipos y lint).
2. **T023** y **T027** no dependen de nada: se pueden hacer ya, en paralelo con T021.
3. **T031** es independiente.

### Oportunidades de paralelismo

- T023, T027 y T031 son independientes entre sí y de T021.
- T022 y T030 esperan a T021.

### Notas informativas (sin tareas de código)

- **D3, idioma de `/api/tts`**: en esta rama la ruta deja que ElevenLabs adivine el idioma de los textos cortos, y las palabras guardadas a veces se pronuncian en español. El arreglo vive en la rama `001-shadow-implement`; Talk se beneficia al fusionarla, sin cambios propios.
- **D4, temas únicos por título**: la unicidad es por título, no por significado; es lo que SC-005 pide tal como está escrito.
- **T021 y la rama de Shadowing**: el patrón de errores de micrófono que T021 reutiliza está en `001-shadow-implement` y todavía no está fusionado. Si esa rama no se ha fusionado cuando se implemente T021, se copia el patrón y los textos; no hace falta esperar.

---

## Ejemplo de ejecución en paralelo

```text
Task: "Verificar el Escenario 4 del quickstart (cuadro de 3 filas) — T023"
Task: "Verificar el Escenario 5 del quickstart (desplazamiento automático) — T027"
Task: "Corregir la nota al pie de checklists/requirements.md — T031"
```

---

## Estrategia de implementación

### Lo único que falta

1. Implementar T021 (FR-020) y comprobar tipos y lint (T030).
2. Verificar a mano T022, T023 y T027 con el quickstart.
3. Corregir la nota de la checklist (T031).

Hasta que T022, T023 y T027 estén hechas, la funcionalidad no debe darse por terminada según el Principio VI.

### Cambios futuros

Este archivo es la base para las siguientes funcionalidades del módulo. Según la constitución (v1.1.0): un cambio visual o de textos va solo en el mensaje del commit; un cambio de comportamiento se registra con `/speckit-clarify`, se anexan tareas nuevas sin borrar las existentes y se implementa solo lo nuevo; una funcionalidad nueva sigue el flujo completo.

---

## Notas

- `[P]` = tareas independientes, sin dependencias pendientes.
- La etiqueta `[US1]` a `[US4]` traza cada tarea a su historia en `spec.md`.
- Commitear después de cada tarea o grupo lógico, sin mezclar cambios no relacionados en el mismo commit (regla de la constitución).
- Nunca ejecutar `supabase db reset` sobre una base con cuentas reales: FR-020 no toca la base de datos.

---

## Fase 7: Convergence (convergencia con la spec)

**Propósito**: cerrar las brechas entre la spec/plan y el código actual, detectadas por `/speckit-converge` el 2026-11-01. Ordenadas de mayor a menor severidad.

- [ ] T032 En `app/api/talk/route.ts`, hacer que la constante `system` exija terminar con una pregunta solo en el modo vocabulario: hoy dice "ending with one engaging question" también en el modo abierto, y eso contradice la instrucción de `respond` ("Ask a question only when it is genuinely useful") según FR-011 (contradicts)
- [ ] T033 En `requestFeedback` de `app/talk/page.tsx`, capturar los fallos de `fetch` y de lectura de la respuesta, mostrar un error claro y liberar `sending`: hoy una conexión interrumpida deja "AI is thinking..." para siempre y los botones deshabilitados, según Casos límite (falla la retroalimentación) y FR-009 (partial)
- [ ] T034 En `speakAssistant` y `skipAssistantAudio` de `app/talk/page.tsx`, cancelar la reproducción anterior aunque el audio siga pidiéndose a `/api/tts`: hoy, si el estudiante salta o cambia de mensaje antes de que llegue, ese audio suena igual, sin botón para detenerlo y pudiendo solaparse con otro, según FR-014 y SC-003 (partial)
- [ ] T035 En el `<textarea>` y `startRecording` de `app/talk/page.tsx`, detener el reconocimiento de voz si el estudiante edita el cuadro mientras graba: hoy `onChange` pasa a `review` sin detenerlo, desaparece "Stop" y el siguiente `onresult` reemplaza lo editado, según FR-012 e Historia 3 escenario 2 (partial)
- [ ] T036 En `handleNewTopic` de `app/talk/page.tsx`, detener el reconocimiento de voz antes de cambiar de tema: hoy sigue activo y escribe en el cuadro de la conversación nueva, según FR-010 y FR-012 (partial)
- [ ] T037 En `sendMessage` de `app/talk/page.tsx`, impedir una sexta respuesta en el modo vocabulario: si falla la retroalimentación tras la quinta, el cuadro sigue disponible y se puede guardar otra respuesta; el reintento debe seguir siendo "Finish & feedback", según FR-006 (partial)
