# Tareas: Shadowing — práctica de pronunciación por repetición

**Entrada**: Documentos de diseño en `/specs/001-shadow-pronunciation/`

**Prerrequisitos**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes)

**Pruebas**: El spec no pidió una suite de pruebas automatizadas (el proyecto no tiene una — Principio VI);
no se generan tareas de test automatizado. La verificación es manual, vía `quickstart.md` y `tsc`/`lint`.

**Organización**: Las tareas están agrupadas por historia de usuario para poder implementarlas y probarlas
de forma independiente.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: se puede hacer en paralelo (archivo distinto, sin dependencias pendientes)
- **[Story]**: a qué historia de usuario pertenece (US1, US2, US3)

## Convenciones de ruta

Next.js 16 App Router, un solo proyecto (sin separación frontend/backend) — rutas relativas a la raíz del
repositorio, según `plan.md`.

---

## Fase 1: Setup (infraestructura compartida)

**Propósito**: crear la estructura de carpetas del módulo, sin lógica todavía.

- [x] T001 Crear la estructura de carpetas vacías `app/shadow/`, `app/api/shadow/generate/` y
  `components/shadow/` según la Estructura del proyecto de `plan.md`.

---

## Fase 2: Foundational (bloqueante para todas las historias)

**Propósito**: infraestructura que TODAS las historias de usuario necesitan antes de poder construirse.

**⚠️ CRÍTICO**: ninguna historia de usuario puede empezar hasta que esta fase esté completa.

- [x] T002 [P] Crear la migración `supabase/migrations/20261017000000_add_shadow_sessions.sql` con la tabla
  `shadow_sessions` (`id` uuid PK, `user_id` uuid FK → `public.users(id)` — no `auth.users` directo, mismo
  patrón que `ai_conversations`/`user_chapter_progress` — `sentence` text, `topic_category` text, `level`
  text, `completed_at` timestamptz, `created_at` timestamptz default now()) y políticas RLS tal como las
  exige data-model.md (corregido durante la implementación): acceso solo donde exista un `public.users`
  con `id = shadow_sessions.user_id` y `auth_user_id = auth.uid()`. Aplicada de forma incremental vía
  `psql` (nunca `supabase db reset`), según el Principio III.
- [x] T003 [P] Implementar `POST /api/shadow/generate` en `app/api/shadow/generate/route.ts` siguiendo
  exactamente el contrato de `contracts/shadow-generate-api.md`: recibe `{ level, recentSentences? }`,
  llama a Anthropic con el mismo SDK/modelo Haiku que ya usa `app/api/talk/route.ts`, y devuelve
  `{ sentence, topic_category }` donde `sentence` nunca coincide textualmente con ninguna de
  `recentSentences` (FR-001, SC-002). La llave `ANTHROPIC_API_KEY` solo se lee en esta ruta de servidor
  (Principio II).
- [x] T004 [P] Crear el helper de comparación de palabras en `lib/shadow.ts`: normaliza (minúsculas, sin
  puntuación ni acentos) tanto la palabra reconocida como la palabra objetivo y las compara por igualdad
  exacta tras normalizar, siguiendo la Decisión 1 de `research.md` (mismo criterio que
  `PracticePhase.tsx`).
- [x] T005 Crear el esqueleto de `components/shadow/ShadowSession.tsx` con el estado base del ejercicio
  (`ShadowExercise` de data-model.md: `sentence`, `words`, `topicCategory`, `level`) y la llamada inicial a
  `/api/shadow/generate` usando el nivel CEFR del estudiante (mismo mecanismo que ya usa Talk with AI).
- [x] T006 Crear `app/shadow/page.tsx` montando `ShadowSession` para el estudiante autenticado, y agregar
  la entrada al módulo Shadowing desde `app/dashboard/page.tsx` (mismo patrón de acceso que Talk with AI).

**Checkpoint**: la base está lista — las historias de usuario pueden empezar a construirse.

---

## Fase 3: Historia de usuario 1 - Completar un ejercicio de shadowing (Prioridad: P1) 🎯 MVP

**Meta**: oración completa en voz alta → repetición palabra por palabra con hasta 3 intentos y opción de
saltar → repetición final de la oración completa → ejercicio marcado como terminado y registrado.

**Prueba independiente**: iniciar el módulo Shadowing, completar el flujo de una sola oración de principio a
fin, y confirmar que se inserta exactamente un renglón en `shadow_sessions` (Escenario 1 de
`quickstart.md`).

### Implementación de la Historia de usuario 1

- [x] T007 [US1] Implementar en `ShadowSession.tsx` la reproducción de la oración completa vía `/api/tts`
  y el botón explícito para iniciar la práctica (FR-002, FR-003).
- [x] T008 [US1] Implementar `components/shadow/WordRepeatStep.tsx`: reproducir la palabra objetivo vía
  `/api/tts`, capturar el habla del estudiante con una instancia corta de `SpeechRecognition` por palabra
  (Decisión 2 de `research.md`), y evaluar el intento con `lib/shadow.ts` (FR-004, FR-006).
- [x] T009 [US1] Implementar en `WordRepeatStep.tsx` el límite de 3 intentos fallidos consecutivos por
  palabra (FR-007) y, al agotarlos, ofrecer "saltar palabra" u "oír más despacio" antes de continuar
  (FR-008).
- [x] T010 [US1] Implementar en `ShadowSession.tsx` el avance a la siguiente palabra únicamente tras un
  intento aceptado o tras usar la opción de saltar de T009 (FR-009).
- [x] T011 [US1] Implementar `components/shadow/FinalSentenceStep.tsx`, el paso final de repetir la
  oración completa de corrido, reutilizando el mismo mecanismo de grabación (Web Speech API + transcripción
  editable) ya usado en `SpeakingPhase`; la evaluación compara contra la oración objetivo con
  `lib/shadow.ts` en lugar de calificar contenido libre, ya que aquí se trata de repetición verbatim, no de
  calidad de contenido (FR-010).
- [x] T012 [US1] Al completarse el paso final, marcar el ejercicio como terminado e insertar el renglón en
  `shadow_sessions` (oración, tema, nivel, fecha) desde `ShadowSession.tsx` (FR-011, FR-014).
- [x] T013 [US1] Mostrar en `WordRepeatStep.tsx`, para el intento en curso, tanto la palabra dicha por la
  IA como el texto reconocido del estudiante (FR-005, alcance mínimo de un solo intento — el historial
  completo de intentos se agrega en la Historia de usuario 3).
- [x] T014 [US1] Manejar en `ShadowSession.tsx`/`WordRepeatStep.tsx` el permiso de micrófono denegado o no
  disponible, con un mensaje claro para el estudiante (FR-012, caso límite del spec).

**Checkpoint**: la Historia de usuario 1 debe funcionar y poder probarse de forma independiente (MVP).

---

## Fase 4: Historia de usuario 2 - Practicar con oraciones y temas distintos (Prioridad: P2)

**Meta**: tras terminar un ejercicio, poder iniciar otro con oración y tema distintos, sin límite de
ejercicios por sesión y sin repetir oraciones dentro de la misma sesión.

**Prueba independiente**: terminar un ejercicio y pedir uno nuevo; confirmar que la oración y el tema son
distintos a los del ejercicio inmediatamente anterior (Escenario 2 de `quickstart.md`).

### Implementación de la Historia de usuario 2

- [x] T015 [US2] Mantener en `ShadowSession.tsx` la lista de oraciones ya usadas en la sesión actual y
  enviarla como `recentSentences` en cada llamada a `/api/shadow/generate` (FR-001).
- [x] T016 [US2] Agregar en `ShadowSession.tsx` la acción "practicar de nuevo" que reinicia el estado del
  ejercicio y solicita una nueva oración, sin límite de ejercicios por sesión (FR-012, SC-002).

**Checkpoint**: las historias 1 y 2 funcionan juntas — ninguna oración se repite dentro de la misma sesión.

---

## Fase 5: Historia de usuario 3 - Ver retroalimentación visual de cada intento (Prioridad: P3)

**Meta**: el cuadro de texto conserva y muestra el historial completo de intentos (aceptados, rechazados y
saltados) de la palabra en curso, no solo el más reciente.

**Prueba independiente**: fallar una palabra varias veces a propósito y confirmar que el historial de esos
intentos previos queda visible en el cuadro de texto (Historia de usuario 3, escenario 2 del spec).

### Implementación de la Historia de usuario 3

- [x] T017 [US3] Extender `WordRepeatStep.tsx` para acumular y mostrar la lista completa de `WordAttempt`
  (de `data-model.md`) de la palabra en curso, no solo el último intento.
- [x] T018 [US3] Distinguir visualmente en el cuadro de texto los intentos aceptados, rechazados y
  saltados, usando el campo `skipped`/`accepted` de `WordAttempt`.

**Checkpoint**: las 3 historias de usuario funcionan de forma independiente.

---

## Fase final: Pulido y aspectos transversales

**Propósito**: mejoras que afectan a varias historias a la vez.

- [x] T019 [P] Mostrar en `app/dashboard/page.tsx` cuántos ejercicios de Shadowing ha completado el
  estudiante, leyendo `shadow_sessions` (SC-005).
- [x] T020 Manejar en `ShadowSession.tsx`/`WordRepeatStep.tsx`/`FinalSentenceStep.tsx` los casos límite
  restantes del spec: navegador sin soporte de `SpeechRecognition`, silencio/ruido de fondo sin
  reconocimiento (intento rechazado con "no speech detected"), palabra completamente distinta a la
  esperada (no coincide tras normalizar), y fallo o demora de `/api/shadow/generate` (pantalla de error
  con reintento) (sección "Casos límite" de `spec.md`).
- [x] T021 Verificar el Principio VI: `npx tsc --noEmit` y `npm run lint` sin errores, `npm run build`
  exitoso (se tocaron rutas nuevas), y prueba manual end-to-end en `npm run dev` contra Supabase local con
  una cuenta de prueba (generación de oración, TTS, flujo palabra por palabra, límite de 3 intentos +
  saltar, historial de intentos, paso final, y KPI del dashboard).
- [x] T022 [P] Confirmar el aislamiento RLS de `shadow_sessions`: verificado funcionalmente (no solo
  estructuralmente) con el token de la cuenta de prueba autenticada — insertar con su propio `user_id`
  devuelve 201, insertar con un `user_id` ajeno devuelve 403 (`42501`, violación de RLS), y un `select`
  solo devuelve sus propios renglones. Datos y cuenta de prueba eliminados después de verificar.

---

## Dependencias y orden de ejecución

### Dependencias por fase

- **Setup (Fase 1)**: sin dependencias — puede iniciar de inmediato.
- **Foundational (Fase 2)**: depende de Setup — BLOQUEA las 3 historias de usuario.
- **Historias de usuario (Fases 3–5)**: todas dependen de que Foundational esté completo.
  - US1 es la única con dependencia dura de Foundational; no depende de US2 ni US3.
  - US2 depende de que `ShadowSession.tsx` ya exista (Foundational + US1 completos, porque reutiliza el
    mismo flujo de "terminar ejercicio" de US1).
  - US3 solo toca `WordRepeatStep.tsx` (creado en Foundational/US1); puede construirse en paralelo a US2,
    que solo toca `ShadowSession.tsx`.
- **Pulido (fase final)**: depende de que las historias deseadas estén completas.

### Oportunidades de paralelismo

- T002, T003 y T004 (Foundational) tocan archivos distintos sin dependencias entre sí → paralelizables.
- Una vez completas las Fases 1–2 y la Fase 3 (US1), las Fases 4 (US2) y 5 (US3) pueden avanzar en paralelo
  por dos personas distintas, porque tocan archivos distintos (`ShadowSession.tsx` vs. `WordRepeatStep.tsx`).
- T019 y T022 (Pulido) son independientes entre sí y de T020/T021 → paralelizables.

---

## Ejemplo de ejecución en paralelo: Foundational

```bash
Task: "Crear la migración shadow_sessions con RLS en supabase/migrations/"
Task: "Implementar POST /api/shadow/generate en app/api/shadow/generate/route.ts"
Task: "Crear el helper de comparación de palabras en lib/shadow.ts"
```

---

## Estrategia de implementación

### MVP primero (solo Historia de usuario 1)

1. Completar la Fase 1: Setup.
2. Completar la Fase 2: Foundational (crítico — bloquea todas las historias).
3. Completar la Fase 3: Historia de usuario 1.
4. **Detenerse y validar**: probar la Historia de usuario 1 de forma independiente (Escenario 1 de
   `quickstart.md`).
5. A partir de ahí, decidir si el módulo ya aporta valor como está o si se continúa con US2/US3.

### Entrega incremental

1. Setup + Foundational → base lista.
2. Historia de usuario 1 → probar de forma independiente → MVP listo.
3. Historia de usuario 2 → probar de forma independiente (no rompe US1).
4. Historia de usuario 3 → probar de forma independiente (no rompe US1 ni US2).
5. Pulido (dashboard, casos límite, verificación del Principio VI, aislamiento RLS).

---

## Notas

- `[P]` = archivos distintos, sin dependencias pendientes.
- La etiqueta de historia (`[US1]`, `[US2]`, `[US3]`) traza cada tarea a su historia de usuario en
  `spec.md`.
- No se generan tareas de prueba automatizada: el proyecto no tiene suite de tests (Principio VI);
  `quickstart.md` es la guía de verificación manual.
- Commitear después de cada tarea o grupo lógico, sin mezclar cambios no relacionados en el mismo commit
  (regla de la constitución).
- Detenerse en cada checkpoint para validar la historia de forma independiente antes de seguir con la
  siguiente.

---

## Fase 6: Convergence (convergencia con la spec)

**Propósito**: cerrar las brechas entre la spec/plan y el código actual, detectadas por
`/speckit-converge` el 2026-10-22. Ordenadas de mayor a menor severidad.

- [ ] T023 En `components/shadow/WordRepeatStep.tsx`, reproducir de nuevo la palabra en voz alta de forma
  automática tras cada intento rechazado, antes de volver a pedir la repetición, per FR-007 y US1/AC3
  (partial)
- [ ] T024 Enviar a `/api/shadow/generate` el tema del ejercicio anterior y, al abrir la sesión, las
  últimas oraciones y temas de `shadow_sessions`; rechazar en `app/api/shadow/generate/route.ts` (con
  reintento) un tema igual al inmediatamente anterior, per SC-002, US2/AC1 y FR-001 (partial)
- [ ] T025 En `components/shadow/WordRepeatStep.tsx` y `components/shadow/FinalSentenceStep.tsx`,
  distinguir los errores de reconocimiento `not-allowed` (permiso denegado) y `audio-capture` (sin
  micrófono) con un mensaje claro cada uno, y no contar como intento fallido el que termina por
  cualquiera de ellos, per FR-013 (partial)
- [ ] T026 En `components/shadow/ShadowSession.tsx`, capturar los fallos de red y de lectura de la respuesta
  en `loadExercise` y agregar un tiempo máximo de espera a la llamada a `/api/shadow/generate`, mostrando la
  pantalla de error con reintento en lugar de quedarse en "Preparing a new sentence...", per el caso límite
  "la generación falla o tarda demasiado" y T020 (partial)
- [ ] T027 En `finishExercise` de `components/shadow/ShadowSession.tsx`, informar al estudiante cuando falle
  el `insert` en `shadow_sessions` y ofrecer reintentar, para que el ejercicio no quede sin registrar en
  silencio, per FR-014 (partial)
- [ ] T028 Revisar y justificar los elementos que la spec no describe: el botón "Listen again" de
  `ShadowSession.tsx`, `WordRepeatStep.tsx` y `FinalSentenceStep.tsx`, y el contador "N done this session"
  de `ShadowSession.tsx`; registrarlos en `spec.md` con `/speckit-clarify` o retirarlos, per spec.md
  (unrequested)
