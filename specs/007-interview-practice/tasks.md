# Tareas: Módulo Interview

**Entrada**: Documentos de diseño en `/specs/007-interview-practice/`

**Prerrequisitos**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes)

**Pruebas**: el proyecto no tiene suite automatizada y la spec no la pide (Principio VI), así que no se generan tareas de prueba automatizada. La verificación es manual, según [quickstart.md](./quickstart.md), más scripts temporales fuera del repositorio para la lectura de PDF, y `tsc`, lint y build.

**Organización**: las tareas se agrupan por historia de usuario y siguen el "Orden de implementación recomendado" de [plan.md](./plan.md). US1 (CV) y US2 (entrevista) son P1; US3 (variedad) y US4 (retroalimentación) son P2.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: se puede hacer en paralelo (archivo distinto, sin dependencias pendientes).
- **[Story]**: a qué historia de usuario pertenece. US1: cargar el CV. US2: la entrevista. US3: preguntas variadas. US4: retroalimentación.
- **[Usuario]**: la verificación la debe hacer el dueño, porque requiere su sesión. No se marca sin su resultado.

## Convenciones de ruta

Next.js 16 App Router, un solo proyecto; rutas relativas a la raíz del repositorio, según [plan.md](./plan.md). Las pantallas con sesión van en `app/(app)/` (005).

## Reglas que aplican a todas las fases

- **Nunca** `npm run db:reset`, `supabase db reset` ni `supabase stop --no-backup`. La migración se aplica con `psql -v ON_ERROR_STOP=1 -f`, tras la copia de la Fase 1.
- Solo web, para navegador de escritorio. Sin requisitos de móvil ni de pantallas táctiles.
- Los textos que ve el estudiante van en inglés, tal cual los de [contracts/interview.md](./contracts/interview.md).
- Toda ruta nueva empieza por `guardRequest`, y el cliente la llama con `postJson` (003).
- Ningún PDF ni CV de prueba entra al repositorio.
- Comentarios en el código solo para explicar un porqué que no sea obvio.
- No leer `.env.local` completo ni imprimir secretos; para la llave pública, solo `grep` de `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Sin commit ni push hasta que el dueño lo pida.

---

## Fase 1: Setup (copia de seguridad y dependencia)

**Propósito**: proteger los datos antes de tocar la base, y dejar lista la dependencia. **Si T002 falla, se detiene todo.**

- [ ] T001 Confirmar que la rama parte de `main` con 006 fusionada (`git merge-base --is-ancestor origin/main HEAD`) y que existen `lib/tts-cache.ts`, `components/navigation/sections.ts` y `app/(app)/talk/page.tsx`. Si no, detenerse y avisar
- [ ] T002 Hacer una copia con el `pg_dump` del contenedor `supabase_db_english-code` (formato personalizado) en `~/Backups/english-code/english-code-<fecha>_<hora>.dump`, con permisos `600`, fuera del repositorio y de iCloud. Verificarla con `pg_restore --list` del contenedor: debe incluir los datos de `auth.users` y de `public.users`. **Si falla la copia o la verificación, detenerse y avisar** (Principio III)
- [ ] T003 Guardar los conteos de filas de cada tabla de `public` y de `auth.users`, solo de lectura con `psql`, junto a la copia en `~/Backups/english-code/`, para compararlos en T007 y T037
- [ ] T004 Instalar `unpdf@2.1.0` con versión exacta como dependencia en `package.json` y `package-lock.json`, y confirmar con `npm ls unpdf` que no trae otras dependencias (research §1)

---

## Fase 2: Fundacional (base de datos y menú)

**Propósito**: las tablas y la sección del menú que usan todas las historias.

- [ ] T005 Crear `supabase/migrations/20261118000000_add_interview_practice.sql` según [data-model.md](./data-model.md), solo con `create table`, `create index`, `alter table ... enable row level security` y `create policy`:
  - `interview_cvs`: `id uuid primary key default gen_random_uuid()`; `user_id uuid not null references public.users(id) on delete cascade` con `unique`; `content text not null check (char_length(trim(content)) between 1 and 20000)`; `created_at` y `updated_at timestamptz not null default now()`.
  - `interviews`: `id`; `user_id` igual que arriba, sin `unique`; `focus_title text not null check (char_length(trim(focus_title)) between 1 and 200)`; `question_count smallint not null default 6 check (question_count between 1 and 10)`; `status text not null default 'in_progress' check (status in ('in_progress', 'finished'))`; `feedback jsonb`; `created_at timestamptz not null default now()`; `finished_at timestamptz`. Índice `(user_id, created_at desc)`.
  - `interview_turns`: `id`; `interview_id uuid not null references public.interviews(id) on delete cascade`; `role text not null check (role in ('recruiter', 'candidate'))`; `content text not null check (char_length(trim(content)) between 1 and 5000)`; `question_type text` con `check (question_type is null or question_type in ('opening', 'cv_experience', 'qa_concepts', 'automation', 'situational', 'practical', 'closing'))`; `created_at timestamptz not null default now()`. Índice `(interview_id, created_at)`.
  - Una política `for all to authenticated` por tabla, con `using` y `with check`, con la misma forma que `shadow_sessions` para `interview_cvs` e `interviews`, y que `ai_conversation_messages` (a través de `interviews`) para `interview_turns`. Un comentario inicial que remita a `specs/007-interview-practice`
- [ ] T006 Aplicar la migración con `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/migrations/20261118000000_add_interview_practice.sql`. Si falla, detenerse y avisar; la migración no toca tablas existentes
- [ ] T007 Comprobar la migración: repetir los conteos de T003 (las tablas existentes, iguales); `relrowsecurity` verdadero en las 3 tablas nuevas y una política en cada una en `pg_policies`; y con la llave pública y sin sesión, `GET /rest/v1/interview_cvs`, `/interviews` e `/interview_turns` en `http://127.0.0.1:54321` devuelven `[]` (quickstart, escenario 1; SC-007)
- [ ] T008 En `components/navigation/sections.ts`, agregar `interview` a `SectionId` y a `SECTIONS`, entre `talk` y `shadow`, con `label: 'Interview'` y `description: 'Practice with a recruiter'`, y el prefijo `['/interview', 'interview']` en `MODULE_SECTIONS` (FR-001)

**Punto de control**: las tablas existen con RLS, los datos anteriores están intactos y el menú tiene la sección.

---

## Fase 3: Historia de usuario 1 — Cargar mi CV (Prioridad: P1) 🎯 MVP

**Objetivo**: subir un PDF, revisar su texto, guardarlo, y verlo, editarlo o reemplazarlo después.

**Prueba independiente**: subir un CV, quitar el teléfono, guardar, salir y volver, y luego reemplazarlo.

- [ ] T009 [P] [US1] Crear `lib/cv-text.ts` con `extractCvText(pdf: Uint8Array)`, que usa `unpdf` (`getDocumentProxy` y `extractText` con `mergePages: true`) y devuelve `{ ok: true, text, pages, tooLong }` o `{ ok: false, code: 'invalid_pdf' | 'password_protected' | 'no_text' | 'unreadable' }`. Antes de leer, exige la firma `%PDF` y un máximo de 5 MB. Normaliza el texto: saltos de línea unificados, sin espacios al final de cada línea y como máximo dos líneas vacías seguidas. `tooLong` si supera 20.000 caracteres tras quitar espacios al inicio y al final (contracts/interview.md)
- [ ] T010 [US1] Probar `lib/cv-text.ts` con un script temporal en el directorio temporal de la sesión, con PDF de muestra creados ahí mismo: uno de texto de 2 páginas (por ejemplo, con `cupsfilter` a partir de un `.txt`), uno solo de imagen (con `sips -s format pdf` a partir de una imagen) y un archivo que no es PDF. Esperado: el texto completo en menos de 10 segundos, `no_text` e `invalid_pdf`. Si no hay una herramienta local para cifrar un PDF, el caso `password_protected` queda para T016. No se versiona (SC-001)
- [ ] T011 [US1] Crear `app/api/interview/cv-text/route.ts`: `guardRequest` con `maxBodyBytes` de 7 MB; validar que `pdf` es un texto; decodificar el base64; llamar a `extractCvText` y responder según [contracts/interview.md](./contracts/interview.md), con 400, 422 o 500 y sus textos exactos. No guarda nada ni llama a ningún proveedor (FR-003, FR-008)
- [ ] T012 [US1] Crear `components/interview/CvEditor.tsx`: carga el CV de `interview_cvs` del estudiante; botón `Choose a PDF` (`accept="application/pdf"`) que rechaza más de 5 MB antes de enviar, convierte a base64 y llama a `/api/interview/cv-text` con `postJson`; cuadro de texto editable con el texto, la ayuda `Review the text before saving. You can remove your phone number or email.` y el contador `<n> / 20,000 characters`; botón `Save CV`, deshabilitado si el texto está vacío o supera 20.000 caracteres, que hace `upsert` con `onConflict: 'user_id'` y `updated_at` actual; al reemplazar un CV guardado, confirma antes de guardar. Muestra los errores de la ruta y la fecha de la última actualización. `useUnsavedWork` mientras el texto sea distinto del guardado. `Breadcrumbs` con `interview` y `Your CV` (FR-004 a FR-008, FR-022)
- [ ] T013 [US1] Crear `app/(app)/interview/cv/page.tsx`, que solo monta `CvEditor`
- [ ] T014 [US1] En `app/(app)/dashboard/page.tsx`, agregar la sección `interview`: leer `updated_at` de `interview_cvs` del estudiante junto con los demás datos, y mostrar una tarjeta con `Upload your CV to start practicing.` y el botón `Upload your CV` si no hay CV, o `CV updated on <fecha>` con los botones `Review your CV` y `Start an interview` si lo hay. Los botones llevan a `/interview/cv` y `/interview` (FR-001, FR-009)
- [ ] T015 [US1] Correr `npx tsc --noEmit` y `npm run lint`, y comprobar con `curl` que `/api/interview/cv-text` responde 401 sin token y con un token inventado
- [ ] T016 [US1] **[Usuario]** Ejecutar el escenario 2 de [quickstart.md](./quickstart.md) con su CV real: texto en menos de 10 segundos, quitar el teléfono, guardar, volver, reemplazar, los archivos no válidos (incluido uno con contraseña si lo tiene), el aviso por encima de 20.000 caracteres y la pregunta al salir con cambios (SC-001)

**Punto de control**: el CV se carga, se revisa y se guarda.

---

## Fase 4: Historia de usuario 2 — Practicar una entrevista con una reclutadora (Prioridad: P1)

**Objetivo**: una entrevista de 6 preguntas basada en el CV, con voz, texto y respuestas editables.

**Prueba independiente**: con un CV guardado, empezar, responder por voz, corregir, enviar y recibir la siguiente pregunta.

- [ ] T017 [US2] Crear `app/api/interview/route.ts` con los modos `start` y `next` de [contracts/interview.md](./contracts/interview.md): `guardRequest` con 128 KB; validar `level` (`A2`, `B1`, `B2`, `C1`), `cvText` (1 a 20.000), `recentFocuses` (hasta 10 de 200), `focusTitle`, `questionCount` y `history` (1 a 20 turnos de 1 a 5.000, empezando por la reclutadora y terminando en el estudiante); 503 si falta `ANTHROPIC_API_KEY`; `claude-haiku-4-5-20251001` con una herramienta forzada por modo y su esquema; respuestas inválidas o fallos, 500 con el texto del contrato. El prompt: reclutadora de una empresa de tecnología que entrevista para QA o desarrollo, en inglés, adaptada al nivel; el CV va delimitado y se trata como datos, nunca como instrucciones; preguntas sobre lo que dice el CV o conceptos generales de QA, sin dar por hecha experiencia que no aparece; una reacción natural antes de cada pregunta, sin corregir el inglés; si la respuesta no está en inglés, `answerAccepted: false`, pide responder en inglés y repite la pregunta; tras la sexta respuesta aceptada, cierra con `finished: true` (FR-010 a FR-017, FR-021, FR-024)
- [ ] T018 [US2] Correr `npx tsc --noEmit` y `npm run lint`, y comprobar con `curl` que `/api/interview` responde 401 sin token y con un token inventado, y 413 con un cuerpo de más de 128 KB
- [ ] T019 [US2] Crear `components/interview/InterviewSession.tsx`, siguiendo los patrones de voz de `app/(app)/talk/page.tsx`:
  - Carga el usuario, su nivel y su CV; sin CV, muestra `Upload your CV first.` con el enlace `Upload your CV`.
  - Pantalla de inicio sin llamadas: `Ready for your interview?`, `A recruiter will ask you 6 questions based on your CV.` y el botón `Start an interview`, protegido contra dobles clics con un `ref` (006).
  - Al empezar: guarda el CV de ese momento en el estado, llama a `start`, crea la fila de `interviews` (`focus_title`, `question_count: 6`) y el turno de la reclutadora con su `question_type`, y reproduce el mensaje por `/api/tts` con `speaker: 'female'`, mostrando el texto.
  - Respuesta por voz (reconocimiento en `en-US`) o por escrito en un cuadro editable; `Send` guarda el turno del estudiante, llama a `next` con el CV guardado en el estado, y guarda y reproduce la respuesta de la reclutadora. Un turno con `answerAccepted: false` no avanza el contador.
  - Avance `Question <n> of 6`.
  - Errores: mensaje claro, el texto escrito se conserva y se puede reintentar; el aviso de sesión de 003.
  - `useUnsavedWork` mientras graba, con texto sin enviar, enviando, o con al menos una respuesta y sin retroalimentación (005); al cerrarse, detiene el audio y el reconocimiento de voz.
  - `Breadcrumbs` con `interview` y `Practice` (FR-009 a FR-012, FR-022 a FR-024)
- [ ] T020 [US2] Crear `app/(app)/interview/page.tsx`, que solo monta `InterviewSession`
- [ ] T021 [US2] Correr `npx tsc --noEmit` y `npm run lint`, y revisar que la pantalla de inicio no llama a `/api/interview` ni a `/api/tts` (SC-002)
- [ ] T022 [US2] **[Usuario]** Ejecutar los pasos 1 a 4 del escenario 3 de [quickstart.md](./quickstart.md): sin llamadas al entrar, la primera pregunta con voz y texto, responder por voz y corregir, la siguiente pregunta en menos de 5 segundos, y una respuesta en español (SC-002, SC-003)

**Punto de control**: las Historias 1 y 2 forman el MVP.

---

## Fase 5: Historia de usuario 3 — Preguntas variadas y basadas en mi CV (Prioridad: P2)

**Objetivo**: que cada entrevista tenga un enfoque distinto y al menos tres tipos de pregunta.

**Prueba independiente**: hacer varias entrevistas seguidas y comparar enfoques y tipos.

- [ ] T023 [US3] En `components/interview/InterviewSession.tsx`, leer los `focus_title` de las 5 entrevistas más recientes del estudiante (`order('created_at', { ascending: false }).limit(5)`) y enviarlos como `recentFocuses` en `start`. En `app/api/interview/route.ts`, el prompt de `start` exige un enfoque distinto de esos, y el de `start` y `next` exige combinar al menos tres de los tipos `opening`, `cv_experience`, `qa_concepts`, `automation`, `situational` y `practical` a lo largo de las 6 preguntas, con `closing` solo al cerrar (FR-014, FR-015)
- [ ] T024 [US3] **[Usuario]** Ejecutar los pasos 5 y 6 del escenario 3 de [quickstart.md](./quickstart.md): una entrevista completa y 3 más con el mismo CV (SC-004, SC-005)
- [ ] T025 [US3] Comprobar en `interviews` e `interview_turns`, solo de lectura, que las entrevistas de T024 tienen enfoques distintos y que cada una usó al menos tres tipos de pregunta, y revisar sus preguntas contra el CV guardado (SC-004, SC-005)

---

## Fase 6: Historia de usuario 4 — Saber cómo me fue (Prioridad: P2)

**Objetivo**: la retroalimentación al terminar, o antes si el estudiante lo pide.

**Prueba independiente**: terminar una entrevista y revisar la retroalimentación; en otra, pedirla tras 2 respuestas.

- [ ] T026 [US4] En `app/api/interview/route.ts`, agregar el modo `feedback` de [contracts/interview.md](./contracts/interview.md): exige al menos una respuesta del estudiante; devuelve `strengths` (2 a 4), `improvements` (2 a 4, incluidas correcciones de inglés), `nextStep` e `improvedAnswers` (1 a 3, las más débiles, cada una con `question`, `original` e `improved`), con una herramienta forzada y validando la forma antes de responder (FR-018, FR-019)
- [ ] T027 [US4] En `components/interview/InterviewSession.tsx`: botón `Finish & feedback` disponible desde la primera respuesta aceptada; tras la sexta respuesta aceptada, pedir la retroalimentación automáticamente; guardar `feedback`, `status: 'finished'` y `finished_at` en `interviews`; y mostrar la tarjeta con `Strengths`, `What to improve`, `Next step` y `Stronger answers`, con `You said` y `Try this` en cada respuesta mejorada. Con la retroalimentación recibida, deja de haber trabajo sin guardar (FR-018 a FR-020)
- [ ] T028 [US4] Correr `npx tsc --noEmit` y `npm run lint`
- [ ] T029 [US4] **[Usuario]** Ejecutar el escenario 4 de [quickstart.md](./quickstart.md): la retroalimentación tras 6 preguntas, y otra pedida tras 2 respuestas

---

## Fase 7: Pulido y comprobación final

- [ ] T030 [P] Actualizar `AGENTS.md`: `app/api/interview` en la fila de `ANTHROPIC_API_KEY`; en la estructura, `app/(app)/interview/`, `components/interview/`, `lib/cv-text.ts` y las tablas `interview_cvs`, `interviews` e `interview_turns`; y que el PDF se lee en el servidor sin guardarse
- [ ] T031 [P] Actualizar `README.md`: Interview en la lista de funciones, y en "Data and security" que se guarda el texto revisado del CV, no el archivo, y que ese texto se envía a Anthropic en cada entrevista
- [ ] T032 [P] Actualizar `MANUAL_USUARIO.md`: una sección "Interview" con subir y revisar el CV, la entrevista de 6 preguntas, responder por voz y corregir, terminar antes y la retroalimentación
- [ ] T033 Correr `npx tsc --noEmit`, `npm run lint` y `npm run build`, obligatorio por las rutas, la dependencia y la migración. Si `tsc` falla solo por copias `* 2.ts` de iCloud en `.next`, eliminarlas y repetir (Principio VI)
- [ ] T034 Comprobar los pasos 1 y 2 del escenario 5 de [quickstart.md](./quickstart.md) en las dos rutas, y con `git status` que no hay PDF ni CV de prueba en el repositorio
- [ ] T035 Confirmar que el servidor del dueño tomó las rutas y páginas nuevas (`/interview`, `/interview/cv`, `/api/interview`); si hace falta reiniciarlo, pedirle confirmación antes
- [ ] T036 [Usuario] Ejecutar los pasos 3 y 4 del escenario 5 y el escenario 6 de [quickstart.md](./quickstart.md): recargar a media entrevista, sesión vencida con el texto intacto, y Talk, Shadowing y una lección como antes (SC-006)
- [ ] T037 Repetir los conteos de T003 y compararlos: las tablas existentes solo cambian por uso real, y las nuevas tienen el CV y las entrevistas de las pruebas
- [ ] T038 Actualizar el Principio VI en `plan.md` y anotar en `quickstart.md` qué escenarios se verificaron y quién, solo con lo realmente comprobado

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Fase 1 (Setup)**: sin dependencias. **T002 es una barrera**: sin copia verificada no se sigue.
- **Fase 2 (Fundacional)**: depende de la 1. Bloquea a todas las historias, porque crea las tablas.
- **Fase 3 (US1)**: depende de la 2.
- **Fase 4 (US2)**: depende de la 2, y para probarla hace falta un CV guardado (US1).
- **Fase 5 (US3)**: depende de la 4.
- **Fase 6 (US4)**: depende de la 4.
- **Fase 7**: depende de todas las anteriores.

### Dependencias dentro de cada historia

- **US1**: T009 antes de T010 y T011; T012 antes de T013.
- **US2**: T017 antes de T018 y T019; T019 antes de T020.
- **US3**: T023 toca los mismos archivos que T017 y T019, y va después.
- **US4**: T026 antes de T027.

### Oportunidades de paralelismo

- T009 es un archivo nuevo e independiente de la base.
- Las Fases 5 y 6 podrían avanzar a la vez, pero tocan los mismos dos archivos: van en secuencia.
- T030, T031 y T032 tocan archivos distintos.

## Ejemplo de paralelismo: documentación final

```text
T030 AGENTS.md
T031 README.md
T032 MANUAL_USUARIO.md
```

## Estrategia de implementación

### MVP (Fases 1 a 4, con US1 y US2)

El CV guardado y una entrevista de 6 preguntas con voz y texto. Ya permite practicar, aunque sin variedad garantizada ni retroalimentación. Se valida con T016 y T022.

### Entrega incremental

1. Fases 1 y 2: copia de seguridad, dependencia, migración y menú.
2. Fase 3: el CV.
3. Fase 4: la entrevista.
4. Fases 5 y 6: variedad y retroalimentación.
5. Fase 7: documentación, barreras y comprobación final.

## Notas

- **Base de datos**: la única escritura de esquema es T006, después de la copia de T002, y solo crea objetos nuevos. T003, T007, T025 y T037 solo leen.
- **Verificación con sesión**: el navegador integrado no tiene la sesión del dueño, así que T016, T022, T024, T029 y T036 son suyas. La lectura de PDF se prueba sin sesión ni créditos en T010.
- **Créditos en las pruebas**: cada entrevista llama a la IA en cada turno y en la retroalimentación, y genera audio nuevo por cada mensaje de la reclutadora.
- **Enmienda del Principio II**: la lista de rutas debe sumar `interview`, junto con `writing-assistant` y `shadow/generate`. Es una enmienda PARCHE que aprueba el dueño en un cambio aparte, y no genera tareas de código.
- **Trazabilidad**: FR-001 (T008, T014); FR-002 (todas las rutas y páginas del grupo `(app)`); FR-003 a FR-008 (T009 a T012); FR-009 a FR-012 (T014, T017, T019); FR-013 (T017, T019); FR-014 y FR-015 (T017, T023); FR-016 y FR-017 (T017); FR-018 a FR-020 (T026, T027); FR-021 (T011, T017); FR-022 (T012, T019); FR-023 (T019, por `/api/tts`); FR-024 (T017, T019). SC-001 en T010 y T016; SC-002 en T021 y T022; SC-003 en T022; SC-004 y SC-005 en T024 y T025; SC-006 en T036; SC-007 en T007.
