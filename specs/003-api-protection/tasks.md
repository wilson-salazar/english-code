# Tareas: Protección de la API y del acceso a la aplicación

**Entrada**: Documentos de diseño en `/specs/003-api-protection/`

**Prerrequisitos**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes)

**Pruebas**: el proyecto no tiene suite automatizada y la spec no la pide (Principio VI), así que no se generan tareas de prueba automatizada. La verificación es manual, con [quickstart.md](./quickstart.md).

**Organización**: las tareas se agrupan por historia de usuario, pero las fases siguen el "Orden de implementación recomendado" de [plan.md](./plan.md), no la prioridad: el servidor solo en local va al final porque obliga a reiniciar el servidor que usa el dueño, y los errores controlados (P3) van antes del registro porque tocan los mismos archivos que las rutas ya abiertos.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: se puede hacer en paralelo (archivo distinto, sin dependencias pendientes).
- **[Story]**: a qué historia de usuario pertenece (US1 a US6).
- **[Usuario]**: la verificación la debe hacer el dueño: requiere su sesión, su iPhone o su oído. Yo no la doy por hecha.
- **[Confirmar]**: antes de ejecutarla hay que pedir confirmación al dueño en el chat, justo en ese momento.

## Convenciones de ruta

Next.js 16 App Router, un solo proyecto; rutas relativas a la raíz del repositorio, según [plan.md](./plan.md). Los números de línea de las llamadas corresponden a `main` en el momento de escribir estas tareas.

## Reglas que aplican a todas las fases

- **Nunca** `npm run db:reset`, `supabase db reset` ni `supabase stop --no-backup`.
- Los textos que ve el estudiante van en inglés; se usan tal cual los de [contracts/api-protection.md](./contracts/api-protection.md).
- Comentarios en el código solo para explicar un porqué que no sea obvio.

---

## Fase 1: Setup (copia de seguridad y conteos)

**Propósito**: tener de dónde recuperar los datos y con qué compararlos antes de cualquier cambio (Principio III, FR-018).

**⚠️ CRÍTICO**: si una tarea de esta fase falla, se detiene todo y se avisa al dueño.

- [X] T001 Guardar conteos exactos con `count(*)` (no estimaciones) de `auth.users` y de cada tabla base de `public`, con consultas de solo lectura vía `psql`, en `~/Backups/english-code/counts-<fecha>-inicio.txt` (FR-018, SC-006)
- [X] T002 Crear la copia con el `pg_dump` del contenedor, no el del Mac (versión 14 frente a la 17.6 del servidor): `docker exec supabase_db_english-code pg_dump -U postgres -d postgres -Fc`, redirigido a `~/Backups/english-code/english-code-<fecha>.dump`, comprobando el código de salida y con permisos `600`; ese directorio no está en el repositorio ni en iCloud (Principio III)
- [X] T003 Verificar la copia de T002 con `pg_restore --list` del contenedor: debe ser legible e incluir `TABLE DATA` de `auth.users` y de `public.users`. Si falla, **se detiene todo** (Principio III)

**Punto de control**: copia verificada y conteos guardados. Sin esto no se empieza.

---

## Fase 2: Fundacional (el cliente ya envía el token)

**Propósito**: que todas las pantallas envíen la sesión y soporten un rechazo **antes** de que el servidor lo exija, para que ninguna se rompa a mitad de camino.

**⚠️ CRÍTICO**: ninguna historia empieza hasta terminar esta fase. Las tareas de evaluaciones (T005 a T007) van obligatoriamente antes de la guarda de la Fase 3: hoy un error de la ruta llega a `setFeedback` y rompe el render en `feedback.scores`.

- [X] T004 Crear `lib/api.ts` con `postJson(path, body, init?)` y la constante del evento de ventana, según [research.md](./research.md) §3 y el [contrato](./contracts/api-protection.md): obtiene el token con `supabase.auth.getSession()`, hace el POST con `Content-Type: application/json` y `Authorization: Bearer <token>`, acepta `signal` y devuelve un `Response`; ante 401 llama a `refreshSession()` y reintenta una sola vez; si sigue en 401 emite el evento con `session_expired`; ante 503 con `code: "session_unverified"` emite el evento sin reintentar (FR-004, FR-007, FR-008)

**Las 3 evaluaciones: `postJson` y corrección del manejo de errores** (FR-008, FR-009, FR-021)

- [X] T005 [P] En `components/phases/SpeakingPhase.tsx` (línea 87, `/api/evaluate-speech`), usar `postJson`; agregar un estado de error; si `!res.ok`, no llamar a `setFeedback`, mostrar `data.error` o un texto genérico en inglés y conservar `transcript`; reemplazar el `catch` silencioso por un mensaje de error de conexión
- [X] T006 [P] En `components/phases/ExpressionPhase.tsx` (línea 45, `/api/evaluate`), usar `postJson`; agregar un estado de error; si `!res.ok`, no llamar a `setFeedback`, no escribir en `user_responses` ni `user_progress`, mostrar `data.error` o un texto genérico en inglés y conservar `response`; reemplazar el `catch` silencioso por un mensaje de error
- [X] T007 [P] En `components/phases/ChapterExpressionPhase.tsx` (línea 45, `/api/evaluate-chapter`), usar `postJson`; agregar un estado de error; si `!res.ok`, no llamar a `setFeedback`, no escribir en `user_chapter_responses` ni `user_chapter_progress`, mostrar `data.error` o un texto genérico en inglés y conservar `response`; reemplazar el `catch` silencioso por un mensaje de error

**Audio de lecciones y capítulos: solo `postJson`** (FR-006)

- [X] T008 [P] En `components/phases/ImmersionPhase.tsx` (línea 31, `/api/tts`), usar `postJson`
- [X] T009 [P] En `components/phases/ExplanationPhase.tsx` (línea 30, `/api/tts`), usar `postJson`
- [X] T010 [P] En `components/phases/ListeningPhase.tsx` (línea 27, `/api/tts`), usar `postJson`
- [X] T011 [P] En `components/phases/ComprehensionPhase.tsx` (línea 44, `/api/tts`), usar `postJson`

**Shadowing: solo `postJson`** (FR-006)

- [X] T012 [P] En `components/shadow/ShadowSession.tsx`, usar `postJson` en las 2 llamadas: línea 46 (`/api/tts`) y línea 79 (`/api/shadow/generate`, conservando `signal: controller.signal`)
- [X] T013 [P] En `components/shadow/WordRepeatStep.tsx` (línea 40, `/api/tts`), usar `postJson`
- [X] T014 [P] En `components/shadow/FinalSentenceStep.tsx` (línea 26, `/api/tts`), usar `postJson`

**Vocabulario y Talk with AI: solo `postJson`** (FR-006)

- [X] T015 [P] En `components/FloatingVocabulary.tsx` (línea 85, `/api/vocabulary/translate`), usar `postJson`
- [X] T016 [P] En `app/talk/page.tsx`, usar `postJson` en las 4 llamadas: línea 121 (`/api/tts`), línea 221 (`/api/talk`, `start`), línea 547 (`/api/talk`, `respond`) y línea 607 (`/api/talk`, `feedback`)

**Barrera de la fase**

- [X] T017 Confirmar que no queda ninguna llamada directa con `grep -rn "fetch('/api" app components lib`, que debe dar 0 resultados fuera de `lib/api.ts`; correr `npx tsc --noEmit` y `npm run lint`

**Punto de control**: las 16 llamadas envían el token, y las rutas aún no lo exigen, así que la app sigue funcionando igual.

---

## Fase 3: Historia de usuario 1 — Solo el dueño con sesión gasta créditos (Prioridad: P1) 🎯 MVP

**Objetivo**: las 7 rutas rechazan lo que no tenga sesión válida, antes de llamar al proveedor.

**Prueba independiente**: POST a cada ruta sin sesión y con un token inventado; todas responden 401 y el proveedor no recibe llamadas.

- [X] T018 [US1] Crear `lib/api-guard.ts` con `guardRequest(request, { maxBodyBytes })`, solo para el servidor, según [research.md](./research.md) §1 y §2 y el [contrato](./contracts/api-protection.md). En este orden: lee el token de `Authorization: Bearer`; lo valida con `auth.getUser(token)` usando un cliente con `persistSession: false` y `autoRefreshToken: false`; rechaza con 401 `session_expired` si no hay token, si es inválido o si `user.is_anonymous`; con 503 `session_unverified` si `isAuthRetryableFetchError` o estado 5xx; lee el cuerpo como texto y rechaza con 413 `too_large` si supera `maxBodyBytes`; lo analiza como JSON y rechaza con 400 `invalid_request` si es inválido o no es un objeto. Devuelve el cuerpo o la respuesta de rechazo. Exporta también los helpers de respuesta 400 y 413 para los campos (FR-001, FR-002, FR-003, FR-005, FR-010, FR-012, FR-015)

Aplicar `guardRequest` como primer paso de cada ruta, reemplazando `request.json()`, con el tope de cuerpo del contrato. Los avisos de llave sin configurar pasan a ir **después** de la guarda.

- [X] T019 [P] [US1] `app/api/tts/route.ts`, 16 KB (FR-001)
- [X] T020 [P] [US1] `app/api/evaluate/route.ts`, 32 KB (FR-001)
- [X] T021 [P] [US1] `app/api/evaluate-speech/route.ts`, 32 KB (FR-001)
- [X] T022 [P] [US1] `app/api/evaluate-chapter/route.ts`, 32 KB (FR-001)
- [X] T023 [P] [US1] `app/api/talk/route.ts`, 1 MB (FR-001)
- [X] T024 [P] [US1] `app/api/shadow/generate/route.ts`, 32 KB (FR-001)
- [X] T025 [P] [US1] `app/api/vocabulary/translate/route.ts`, 16 KB (FR-001)

**Verificación**

- [X] T026 [US1] Correr `npx tsc --noEmit` y `npm run lint`, y ejecutar el escenario 1 de [quickstart.md](./quickstart.md): la comprobación con `grep -L guardRequest`, 401 en las 7 rutas sin token y con token inventado, y 401 con `text/plain` y `Origin` ajeno (FR-001, FR-003, FR-004, SC-001, SC-003)

**Punto de control**: las peticiones sin sesión ya no gastan créditos.

---

## Fase 4: Historia de usuario 2 — El dueño sigue usando todo igual (Prioridad: P1)

**Objetivo**: con sesión todo funciona como antes y, si vence, un solo aviso sin perder lo escrito.

**Prueba independiente**: recorrer un flujo de cada módulo con sesión; simular una sesión vencida y confirmar el aviso único y el texto conservado.

- [X] T027 [US2] Crear `components/SessionNotice.tsx` según [research.md](./research.md) §4 y [data-model.md](./data-model.md): escucha el evento de `lib/api.ts`; con `session_expired` muestra una vez "Your session has expired. Sign in to continue — your work on this page is safe." con un formulario de correo y contraseña que llama a `signInWithPassword` sin navegar; con `session_unverified` muestra "We couldn't verify your session. Please try again.", descartable y sin formulario; se oculta con `SIGNED_IN` en `onAuthStateChange`; debe quedar por encima de la barra inferior de Talk (FR-008, FR-009)
- [X] T028 [US2] Montar `SessionNotice` en `app/layout.tsx`, junto a `FloatingVocabulary` (FR-008)

**Verificación**

- [X] T029 [US2] Correr `npx tsc --noEmit` y `npm run lint` (Principio VI)
- [X] T030 [US2] **[Usuario]** Ejecutar el escenario 2 de [quickstart.md](./quickstart.md): un flujo de lecciones, capítulos, Shadowing, Talk with AI y vocabulario, sin pasos nuevos y sin notar lentitud (FR-006, SC-002). Hecho el 2026-11-11: el dueño informó que todo funciona, y los registros confirman la respuesta de lección y la de capítulo con su retroalimentación, el progreso, 2 palabras con su significado, Shadowing y Talk en los dos modos. Los audios y Speaking no dejan rastro y se apoyan en su informe
- [ ] T031 [US2] **[Usuario]** Ejecutar el escenario 3 de [quickstart.md](./quickstart.md): sesión vencida en una evaluación, en Talk y en audio, con un solo aviso y lo escrito intacto; y renovación pasada una hora (FR-007, FR-008, FR-009, SC-008)

**Punto de control**: la protección no rompió el uso diario.

---

## Fase 5: Historia de usuario 4 — Entradas demasiado grandes no llegan al proveedor (Prioridad: P2)

**Objetivo**: cada ruta valida sus campos antes de llamar al proveedor, sin rechazar el uso normal.

**Prueba independiente**: con sesión, exceder un campo por ruta y recibir 413 sin llamada al proveedor; el contenido real más largo se acepta.

Validar tipo y tamaño, y responder con los helpers de T018. Los valores salen del [contrato](./contracts/api-protection.md); los recortes existentes se conservan (FR-013).

- [X] T032 [P] [US4] `app/api/tts/route.ts`: `text` obligatorio, de 1 a 3000 caracteres (FR-010, FR-011, FR-012)
- [X] T033 [P] [US4] `app/api/evaluate/route.ts`: `response` obligatorio, hasta 5000; `prompt` hasta 2000; `scenarioTitle` hasta 200 (FR-010, FR-012)
- [X] T034 [P] [US4] `app/api/evaluate-speech/route.ts`: `transcript` obligatorio, hasta 5000; `prompt` hasta 2000; `scenarioTitle` hasta 200 (FR-010, FR-012)
- [X] T035 [P] [US4] `app/api/evaluate-chapter/route.ts`: `response` obligatorio, hasta 5000; `prompt` hasta 2000; `chapterTitle` hasta 200 (FR-010, FR-012)
- [X] T036 [P] [US4] `app/api/talk/route.ts`: `vocabulary[]` cada una hasta 120; `previousTopics[]` cada uno hasta 200; último mensaje de `history` con rol `user`, hasta 5000; arreglos validados como texto antes de usarlos. Conservar los recortes a 10 palabras, 80 títulos, 20 mensajes y 5000 por mensaje anterior. En `app/talk/page.tsx`, rechazar antes de guardar una respuesta de más de 5000 caracteres, porque una respuesta guardada que el servidor rechaza no se podría reintentar (FR-010, FR-012, FR-013)
- [X] T037 [P] [US4] `app/api/shadow/generate/route.ts`: `recentSentences[]` cada una hasta 500, validadas como texto. Conservar los recortes a 50 oraciones y `previousTopic` a 120 (FR-010, FR-012, FR-013)
- [X] T038 [P] [US4] `app/api/vocabulary/translate/route.ts`: `terms[]` cada una hasta 120, validadas como texto. Conservar el recorte a 10 términos (FR-010, FR-012, FR-013)

**Verificación**

- [X] T039 [US4] Correr `npx tsc --noEmit` y `npm run lint` (Principio VI)
- [ ] T040 [US4] **[Usuario]** Ejecutar el escenario 4 de [quickstart.md](./quickstart.md), que requiere su sesión: 413 por ruta, 400 con un cuerpo inválido, sin falsos rechazos con el texto de 1219 caracteres y una respuesta de 4500, y el error con el texto intacto en Talk por encima de 5000 (FR-010, FR-011, FR-012, SC-004)

**Punto de control**: una sola petición ya no puede gastar una cantidad grande de créditos.

---

## Fase 6: Historia de usuario 6 — Los errores no revelan detalles internos (Prioridad: P3)

**Objetivo**: los fallos del proveedor llegan como errores genéricos y el detalle queda en el registro del servidor.

**Prueba independiente**: con una llave inválida, la respuesta no incluye texto del proveedor y la pantalla muestra un mensaje claro.

- [X] T041 [P] [US6] En `app/api/tts/route.ts`, quitar `detail` de la respuesta, conservar el `console.error` con el detalle y capturar con `try/catch` un fallo de red hacia el proveedor, respondiendo 500 genérico (FR-020, FR-021)
- [X] T042 [P] [US6] En `app/api/evaluate/route.ts`, envolver la llamada al proveedor en `try/catch`, registrar el detalle y responder 500 genérico; rechazar un resultado sin `scores`, que hoy devuelve `{}` con estado 200 (FR-020, FR-021)
- [X] T043 [P] [US6] En `app/api/evaluate-speech/route.ts`, lo mismo que T042 (FR-020, FR-021)
- [X] T044 [P] [US6] En `app/api/evaluate-chapter/route.ts`, lo mismo que T042 (FR-020, FR-021)
- [X] T045 [US6] Leer `app/api/talk/route.ts`, `app/api/shadow/generate/route.ts` y `app/api/vocabulary/translate/route.ts` y confirmar que ya controlan el fallo del proveedor sin exponer su texto; corregir solo si no es así (FR-020, FR-021)

**Verificación**

- [X] T046 [US6] Correr `npx tsc --noEmit` y `npm run lint` (Principio VI)
- [ ] T047 [US6] **[Usuario]** Ejecutar el escenario 7 de [quickstart.md](./quickstart.md), porque implica cambiar temporalmente llaves en `.env.local`, que yo no leo: error genérico en audio y en una evaluación, respuesta conservada y nada escrito en la base; **restaurar las llaves al terminar** (FR-020, FR-021, SC-009)

**Punto de control**: las rutas ya no filtran detalles internos ni rompen las pantallas.

---

## Fase 7: Historia de usuario 3 — No se pueden crear cuentas nuevas (Prioridad: P2)

**Objetivo**: exigir sesión protege de verdad porque nadie más puede obtener una.

**Prueba independiente**: intentar registrarse por la app y directamente contra el servicio de autenticación; ambas fallan, sigue habiendo 1 cuenta y el dueño puede entrar.

**⚠️ CRÍTICO**: es el único paso con riesgo real para los datos. Si los conteos no coinciden o algo falla, se detiene y se avisa al dueño.

- [X] T048 [P] [US3] En `app/page.tsx`, quitar el modo `signup` de `AuthMode`, `handleSignup`, `continueSignup`, el paso de elegir nivel, el estado asociado (`signupStep`, `selectedLevel`, `name`) y el enlace "Create one". Conservar `login` y `forgot` (FR-016, FR-017)
- [X] T049 [US3] En `supabase/config.toml`, poner `enable_signup = false` en `[auth]` y dejar `[auth.email] enable_signup = true`, porque en `false` también desactiva el inicio de sesión con correo (corregido el 2026-11-01 tras comprobarlo en T053); no tocar `enable_anonymous_sign_ins` ni `[auth.sms]`, que ya están en `false` (FR-014, FR-015, FR-018)
- [X] T050 [US3] Repetir T001 a T003 con una copia y unos conteos **nuevos**, justo antes del reinicio, en `~/Backups/english-code/`, para incluir lo que el dueño haya hecho desde la Fase 1. Si la verificación falla, se detiene todo (Principio III, FR-018)
- [X] T051 [US3] **[Confirmar]** Pedir confirmación al dueño en el chat y, solo con su visto bueno, ejecutar `npm run db:stop` y luego `npm run db:start`. **Nunca** `db:reset` ni `--no-backup` (FR-018)
- [X] T052 [US3] Repetir los conteos y compararlos con los de T050: cada tabla debe tener al menos los mismos registros, y `auth.users` exactamente 1. Si no coinciden, se detiene y se avisa al dueño (FR-018, SC-006)
- [X] T053 [US3] Confirmar que `GET /auth/v1/settings` devuelve `disable_signup: true`. **Solo entonces**, intentar un registro directo contra `/auth/v1/signup` con una dirección de prueba no real, confirmar que se rechaza y que `auth.users` sigue en 1; lo mismo con un intento de sesión anónima (FR-014, FR-015, SC-005)

**Documentación** (cómo crear la cuenta en una instalación nueva, según [research.md](./research.md) §6)

- [X] T054 [P] [US3] En `README.md`, explicar que el registro está cerrado y cómo crear la cuenta en una instalación nueva desde Studio, incluidos `full_name` y `level_code` para que el perfil no quede sin nivel; corregir la línea 101, que menciona "sign up" (FR-014)
- [X] T055 [P] [US3] En `AGENTS.md`, actualizar la línea 37, que dice "login/signup/forgot password", y agregar en Conventions que toda ruta nueva que gaste créditos usa `guardRequest` y que el cliente llama con `postJson` (FR-005, FR-014)
- [X] T056 [P] [US3] En `MANUAL_USUARIO.md`, reemplazar el paso "Crear una cuenta" de la línea 21 por iniciar sesión (FR-016)

**Verificación**

- [X] T057 [US3] Correr `npx tsc --noEmit` y `npm run lint`; abrir la pantalla de inicio y confirmar que no ofrece el registro (FR-016)
- [X] T058 [US3] **[Usuario]** Iniciar sesión con su cuenta, comprobar su progreso y sus palabras guardadas, y pedir el correo de restablecimiento en el buzón local, sin cambiar la contraseña si no quiere (FR-017, FR-018, SC-006). Hecho el 2026-11-12: el dueño inició sesión y confirmó su progreso y sus palabras. Las dos solicitudes de recuperación respondieron 200 y los dos correos llegaron al buzón local. La contraseña no se cambió

**Punto de control**: solo la cuenta del dueño puede obtener una sesión.

---

## Fase 8: Historia de usuario 5 — El servidor solo escucha en el propio equipo (Prioridad: P2)

**Objetivo**: el servidor deja de aceptar conexiones de la red local de forma predeterminada.

**Prueba independiente**: tras reiniciar, `lsof` muestra `127.0.0.1:3000`, la app abre en el Mac y no conecta desde el iPhone.

- [X] T059 [US5] En `package.json`, cambiar los scripts a `"dev": "next dev -H 127.0.0.1"` y `"start": "next start -H 127.0.0.1"`; `start-dev.sh` usa `npm run dev`, así que lo hereda sin cambios (FR-019)

La comprobación de este cambio se hace en la fase final, porque requiere reiniciar el servidor.

---

## Fase 9: Pulido y comprobación final

**Propósito**: la barrera completa del Principio VI y el reinicio del servidor.

- [X] T060 Correr `npx tsc --noEmit`, `npm run lint` y `npm run build`, obligatorio por tocar rutas y configuración. Si `tsc` falla solo por copias `* 2.ts` de iCloud en `.next`, eliminar esas copias generadas y repetir (Principio VI)
- [X] T061 **[Confirmar]** Avisar al dueño de que se reinicia el servidor y puede interrumpir lo que esté haciendo; con su visto bueno, detener el proceso que escucha en el puerto 3000 y arrancarlo de nuevo con `npm run dev` (FR-019)
- [X] T062 [US5] Ejecutar los pasos 2 y 3 del escenario 6 de [quickstart.md](./quickstart.md): `lsof` debe mostrar `127.0.0.1:3000`, y `http://localhost:3000` debe funcionar con recarga en caliente y sin advertencias de origen. Si Next.js las muestra, agregar `allowedDevOrigins: ['localhost']` en `next.config.ts` y reiniciar (FR-019, research §9)
- [ ] T063 [US5] **[Usuario]** Confirmar que la app no abre desde el iPhone por Wi-Fi en `http://<IP del Mac>:3000` y, tras reiniciar el Mac, que el arranque automático deja el servidor en `127.0.0.1:3000` (FR-019, SC-007)
- [ ] T064 **[Usuario]** Comprobar la dependencia de [plan.md](./plan.md): `http://<IP del Mac>:54323` no debe abrir desde el iPhone por Wi-Fi. Queda fuera del alcance y **no genera tareas de código**, pero sin esto el conjunto no queda protegido
- [ ] T065 Actualizar `specs/003-api-protection/plan.md` con el Principio VI en PASS y anotar en `quickstart.md` qué escenarios se verificaron y quién los hizo, solo con lo realmente comprobado (Principio VI)

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Fase 1 (Setup)**: sin dependencias; bloquea todo lo demás.
- **Fase 2 (Fundacional)**: depende de la 1. Bloquea las historias. T004 va antes de T005 a T016.
- **Fase 3 (US1)**: depende de la 2. T018 va antes de T019 a T025.
- **Fase 4 (US2)**: depende de la 3, porque el aviso solo se dispara cuando las rutas rechazan.
- **Fase 5 (US4)**: depende de T018. Los helpers de 400 y 413 están ahí.
- **Fase 6 (US6)**: depende de la 3, porque toca las mismas rutas.
- **Fase 7 (US3)**: depende de la 3, para que cerrar el registro tenga efecto real; sus pasos T050 a T053 van en orden estricto.
- **Fase 8 (US5)**: independiente en código, pero se hace al final.
- **Fase 9**: depende de todas.

### Dependencias entre historias

- **US1** depende de la Fase 2. **US2** depende de US1 para poder verificar el rechazo.
- **US3** no depende del código de US1, pero sin US1 no protege nada.
- **US4** y **US6** comparten archivos con US1, por eso van después.
- **US5** se puede entregar sola.

### Mismo archivo, en secuencia

Cada ruta se toca en hasta 3 tareas, que van en orden entre fases. Por ejemplo, `app/api/tts/route.ts`: T019, T032 y T041.

### Oportunidades de paralelismo

- Fase 2: T005 a T016 tocan archivos distintos.
- Fase 3: T019 a T025. Fase 5: T032 a T038. Fase 6: T041 a T044.
- Fase 7: T048 con T054 a T056.

## Ejemplo de paralelismo: Historia de usuario 1

```text
Después de T018:
T019 app/api/tts/route.ts
T020 app/api/evaluate/route.ts
T021 app/api/evaluate-speech/route.ts
T022 app/api/evaluate-chapter/route.ts
T023 app/api/talk/route.ts
T024 app/api/shadow/generate/route.ts
T025 app/api/vocabulary/translate/route.ts
```

## Estrategia de implementación

### MVP

Fases 1 a 4: las peticiones sin sesión dejan de gastar créditos, y el uso diario sigue igual. Se detiene ahí, se valida y, si todo está bien, se sigue.

**Importante**: el MVP solo no basta para abrir la app a otros dispositivos. Mientras el registro esté abierto (Fase 7), cualquiera que llegue al servidor puede crearse una cuenta y obtener una sesión válida.

### Entrega incremental

1. Copia de seguridad, y cliente con token → la app sigue igual.
2. US1 y US2 → las peticiones sin sesión se rechazan, con aviso claro.
3. US4 y US6 → topes y errores controlados.
4. US3 → registro cerrado, con reinicio confirmado.
5. US5 y reinicio del servidor → solo escucha en local.

## Notas

- **Dependencia fuera del alcance**: la base abierta a la red local. Solo se comprueba en T064; quien llegue a Postgres o a Studio se salta toda esta protección.
- **Trazabilidad**: FR-001 a FR-005 (Fases 2 y 3); FR-006 a FR-009 (Fases 2 y 4); FR-010 a FR-013 (Fases 3 y 5); FR-014 a FR-018 (Fases 1 y 7); FR-019 (Fases 8 y 9); FR-020 y FR-021 (Fases 2 y 6). SC-001 y SC-003 en T026; SC-002 en T030; SC-004 en T040; SC-005 en T053; SC-006 en T052 y T058; SC-007 en T063; SC-008 en T031; SC-009 en T047.
- **Commits**: se hacen solo cuando el dueño los pide. Una rama por etapa de SDD, y sin mezclar cambios no relacionados.
