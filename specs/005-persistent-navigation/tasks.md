# Tareas: Menú de navegación siempre visible

**Entrada**: Documentos de diseño en `/specs/005-persistent-navigation/`

**Prerrequisitos**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes)

**Pruebas**: el proyecto no tiene suite automatizada y la spec no la pide (Principio VI), así que no se generan tareas de prueba automatizada. La verificación es manual, según [quickstart.md](./quickstart.md), más `tsc`, lint y build.

**Organización**: las tareas se agrupan por historia de usuario y siguen el "Orden de implementación recomendado" de [plan.md](./plan.md). US1 y US2 son las dos P1 y se entregan juntas, porque el menú sin la confirmación haría más fácil perder trabajo.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: se puede hacer en paralelo (archivo distinto, sin dependencias pendientes).
- **[Story]**: a qué historia de usuario pertenece. US1: cambiar de módulo desde cualquier pantalla. US2: no perder trabajo. US3: ruta de migas.
- **[Usuario]**: la verificación la debe hacer el dueño, porque requiere su sesión. No se marca sin su resultado.

## Convenciones de ruta

Next.js 16 App Router, un solo proyecto; rutas relativas a la raíz del repositorio, según [plan.md](./plan.md). Tras la Fase 2, las páginas con sesión viven en `app/(app)/`.

## Reglas que aplican a todas las fases

- **Nunca** `npm run db:reset`, `supabase db reset` ni `supabase stop --no-backup`. Esta funcionalidad no cambia la base de datos.
- Solo web, para navegador de escritorio. Sin requisitos de móvil ni de pantallas táctiles.
- Los textos que ve el estudiante van en inglés, tal cual los de [contracts/navigation.md](./contracts/navigation.md).
- Las fases conservan sus props y `onComplete()` (Principio V).
- Comentarios en el código solo para explicar un porqué que no sea obvio.
- No leer `.env.local` completo ni imprimir secretos.
- Sin commit ni push hasta que el dueño lo pida.

---

## Fase 1: Setup

**Propósito**: confirmar el punto de partida y guardar la referencia para SC-008.

- [ ] T001 Confirmar que la rama parte de `main` con 004 fusionada: `git merge-base --is-ancestor origin/main HEAD`, y que existen `app/tools/writing-assistant/page.tsx` y `lib/api.ts`. Si no, detenerse y avisar
- [ ] T002 Guardar los conteos de filas de cada tabla de `public` y de `auth.users`, solo de lectura con `psql`, en el directorio temporal de la sesión, para compararlos en T046 (SC-008)

---

## Fase 2: Fundacional (marco común)

**Propósito**: crear el marco con el menú y mover las pantallas con sesión dentro de él. Bloquea a todas las historias.

- [ ] T003 [P] Crear `components/navigation/sections.ts` con el tipo `SectionId`, el arreglo `SECTIONS` con `id`, `label`, `description` y `href` (`/dashboard?section=<id>`), en el orden y con los textos de [data-model.md](./data-model.md#sección), y la función `sectionFromLocation(pathname, sectionParam)` con la tabla de [research §3](./research.md). Un valor desconocido devuelve `learning` (FR-002, FR-003, FR-004)
- [ ] T004 [P] Crear `components/navigation/NavigationGuard.tsx` según [contracts/navigation.md](./contracts/navigation.md): `NavigationGuardProvider` con un conjunto de fuentes activas; `useUnsavedWork(active)` con `useId`, que entra y sale del conjunto y no hace nada fuera del proveedor; `useGuardedAction()`; `GuardedLink`, que envuelve `Link` y cancela con `onNavigate` y `preventDefault()` si hay fuentes, y navega con `router.push` al elegir "Leave"; un `<dialog>` abierto con `showModal()`, con los textos del contrato, el foco en "Stay", y `Esc` o clic fuera equivalentes a quedarse; y un oyente de `beforeunload` activo solo con fuentes (FR-011 a FR-016)
- [ ] T005 Crear `components/navigation/AppShell.tsx` (cliente): carga una vez el usuario con `supabase.auth.getUser()`, su fila de `users` con `levels(id, code, name)` y la lista de `levels` por `order_index`, con la misma lógica de hoy en `app/dashboard/page.tsx`; si no hay usuario o su fila, envía a `/` sin mostrar el menú; expone `useAccount()` con `{ user, levels, changeLevel }`, que lanza un error fuera del marco; muestra el encabezado de hoy (marca, nombre, nivel con su selector y "Log out"), con "Log out" a través de `useGuardedAction()`; y el menú con un `GuardedLink` por sección, `aria-current` en la activa y la etiqueta `Main sections`. La parte que usa `useSearchParams` va en su propio `<Suspense>`, con el menú sin resaltar como respaldo. Todo dentro de `NavigationGuardProvider`. Conservar las clases del dashboard: menú `sticky` y de `md:w-56` en escritorio, y fila horizontal por debajo de `md`; el desplazamiento sigue siendo el de la ventana (FR-001, FR-003, FR-005, research §7 y §9)
- [ ] T006 Crear `app/(app)/layout.tsx`, que solo envuelve `children` con `AppShell`
- [ ] T007 Mover con `git mv` a `app/(app)/` las carpetas `app/dashboard`, `app/scenario`, `app/chapter`, `app/talk` (con `talk/open`), `app/shadow` y `app/tools`. Comprobar que la reexportación relativa de `app/(app)/talk/open/page.tsx` y las importaciones con `@/` siguen resolviendo. `app/page.tsx` y `app/reset-password` no se mueven (FR-006)
- [ ] T008 Correr `npx tsc --noEmit` y comprobar con `curl` que `/dashboard`, `/dashboard?section=grammar`, `/scenario/<id>`, `/chapter/<id>`, `/talk`, `/talk/open`, `/shadow`, `/tools/writing-assistant`, `/` y `/reset-password` responden 200. Si `tsc` falla solo por copias `* 2.ts` de iCloud en `.next`, eliminarlas y repetir. Si el servidor del dueño no reconoce las rutas movidas, pedirle confirmación antes de reiniciarlo

**Punto de control**: las direcciones no cambian y todas las pantallas con sesión muestran el marco, aunque el dashboard aún tenga su propio encabezado.

---

## Fase 3: Historia de usuario 1 — Cambiar de módulo desde cualquier pantalla (Prioridad: P1) 🎯 MVP

**Objetivo**: el menú en todas las pantallas con sesión, con la sección activa resaltada y conservada al recargar.

**Prueba independiente**: abrir una lección, ver Learning path resaltado, y pulsar Grammar para llegar a la lista de capítulos con un clic.

- [ ] T009 [US1] En `app/(app)/dashboard/page.tsx`, quitar el encabezado, el selector de nivel, "Log out", el menú lateral y la carga del usuario y de los niveles. Leer el usuario y el nivel de `useAccount()`, y volver a cargar las listas cuando cambie el nivel. El estado de carga ocupa solo la columna de contenido, sin `min-h-screen` (FR-005, research §7)
- [ ] T010 [US1] En `app/(app)/dashboard/page.tsx`, sustituir el estado `activeView` por el parámetro `section`, leído con `useSearchParams`; un valor desconocido abre Learning path. Envolver el componente en `<Suspense>` dentro del mismo archivo, porque el build lo exige (FR-004, research §2)
- [ ] T011 [P] [US1] Quitar `min-h-screen` de los contenedores raíz, incluidos sus estados de carga y de error, en `app/(app)/scenario/[id]/page.tsx`, `app/(app)/chapter/[id]/page.tsx`, `app/(app)/talk/page.tsx`, `components/shadow/ShadowSession.tsx` y `components/tools/WritingAssistant.tsx`, porque el marco ya ocupa la altura (research §9)
- [ ] T012 [US1] En `app/(app)/talk/page.tsx`, cambiar la barra para responder, hoy `fixed inset-x-0 bottom-0`, para que quede dentro de la columna de contenido sin tapar el menú, por ejemplo con `sticky bottom-0`, y ajustar el relleno inferior `pb-56`. Comprobar que el desplazamiento automático sigue usando `window` (research §9, SC-007)
- [ ] T013 [US1] Correr `npx tsc --noEmit` y `npm run lint`

**Punto de control**: el menú aparece en todas las pantallas y la sección se conserva al recargar.

---

## Fase 4: Historia de usuario 2 — No perder trabajo al cambiar de módulo (Prioridad: P1)

**Objetivo**: preguntar antes de salir solo cuando hay trabajo sin guardar, y no dejar audio ni micrófono activos al salir.

**Prueba independiente**: escribir una respuesta en una lección sin enviarla, pulsar otra entrada del menú, elegir "Stay" y comprobar que el texto sigue intacto.

### Trabajo pendiente por pantalla (research §5)

- [ ] T014 [P] [US2] `components/phases/ComprehensionPhase.tsx`: `useUnsavedWork` mientras haya alguna respuesta escrita y aún no se haya comprobado
- [ ] T015 [P] [US2] `components/phases/ListeningPhase.tsx`: `useUnsavedWork` mientras haya alguna respuesta escrita y `results === null`
- [ ] T016 [P] [US2] `components/phases/PracticePhase.tsx`: `useUnsavedWork` mientras haya alguna respuesta elegida o escrita y `results === null`
- [ ] T017 [P] [US2] `components/phases/SpeakingPhase.tsx`: `useUnsavedWork` mientras graba, con una transcripción sin evaluar, o evaluando (`loading`)
- [ ] T018 [P] [US2] `components/phases/ExpressionPhase.tsx`: guardar el último texto enviado con éxito, y `useUnsavedWork` mientras evalúa o mientras el texto no vacío sea distinto del último enviado
- [ ] T019 [P] [US2] `components/phases/ChapterExpressionPhase.tsx`: lo mismo que T018
- [ ] T020 [US2] `app/(app)/talk/page.tsx`: `useUnsavedWork` mientras graba, con transcripción sin enviar, enviando, o con al menos una respuesta del estudiante y sin `conversationFinished`. Abrir Talk sin responder no cuenta
- [ ] T021 [P] [US2] `components/shadow/ShadowSession.tsx`: `useUnsavedWork` en las etapas `words` y `final`, y mientras guarda. Las etapas `loading`, `intro`, `done` y `error` no cuentan
- [ ] T022 [P] [US2] `components/tools/WritingAssistant.tsx`: en `WritingAssistantForm`, `useUnsavedWork` mientras haya texto en el cuadro o el inspector esté revisando

### Audio y micrófono al salir (research §6)

- [ ] T023 [P] [US2] `components/phases/ImmersionPhase.tsx`: al cerrarse, pausar el audio y cancelar los temporizadores de la repetición
- [ ] T024 [P] [US2] `components/phases/ExplanationPhase.tsx`: al cerrarse, pausar el audio
- [ ] T025 [US2] `components/phases/ListeningPhase.tsx` y `components/phases/ComprehensionPhase.tsx`: al cerrarse, pausar el audio. Va después de T014 y T015, porque toca los mismos archivos
- [ ] T026 [US2] `components/phases/SpeakingPhase.tsx`: al cerrarse, abortar el reconocimiento de voz para liberar el micrófono. Va después de T017
- [ ] T027 [P] [US2] `components/shadow/FinalSentenceStep.tsx`: al cerrarse, abortar el reconocimiento de voz y pausar el audio
- [ ] T028 [US2] Correr `npx tsc --noEmit` y `npm run lint`, y revisar que ninguna condición cuenta la generación de audio, del tema de Talk o de la oración de Shadowing (SC-003)

**Punto de control**: las Historias 1 y 2 juntas forman el MVP.

---

## Fase 5: Historia de usuario 3 — Moverse dentro de un módulo con la ruta de migas (Prioridad: P2)

**Objetivo**: cambiar "← Dashboard" por una ruta de migas, y volver a la sección correcta al terminar.

**Prueba independiente**: abrir un capítulo, ver "Grammar › <título>", pulsar Grammar y llegar a la lista de capítulos.

- [ ] T029 [P] [US3] Crear `components/navigation/Breadcrumbs.tsx` con las props `section` y `current` del contrato: un `nav` con la etiqueta `Breadcrumb`, la sección como `GuardedLink` y la pantalla actual con `aria-current="page"` (FR-007)
- [ ] T030 [US3] `app/(app)/scenario/[id]/page.tsx`: poner `Breadcrumbs` con `learning` y el título de la lección; mostrar "← Back" solo desde la segunda fase; al terminar la última fase, ir a `/dashboard?section=learning`; y llevar el botón del estado de error a esa misma dirección. Conservar el título, el tipo de fase, el contador y la barra de avance (FR-007 a FR-010)
- [ ] T031 [US3] `app/(app)/chapter/[id]/page.tsx`: lo mismo que T030, con `grammar` y `/dashboard?section=grammar`
- [ ] T032 [US3] `app/(app)/talk/page.tsx`: cambiar "← Dashboard" por `Breadcrumbs` con `talk` y `Practice your saved words`, o `Bring any topic` en modo abierto. Conservar el título y el botón de tema nuevo
- [ ] T033 [P] [US3] `components/shadow/ShadowSession.tsx`: cambiar "← Dashboard" por `Breadcrumbs` con `shadow` y `Practice`. Conservar el contador de ejercicios
- [ ] T034 [P] [US3] `components/tools/WritingAssistant.tsx`: cambiar "← Dashboard" por `Breadcrumbs` con `tools` y `Writing Assistant`
- [ ] T035 [US3] Confirmar con `grep` que no queda ningún "← Dashboard" ni `router.push('/dashboard')` sin sección en `app/` ni en `components/`, y correr `npx tsc --noEmit` y `npm run lint` (FR-008, FR-010)

**Punto de control**: las tres historias funcionan.

---

## Fase 6: Pulido y comprobación final

- [ ] T036 [P] Actualizar `AGENTS.md`: rutas nuevas bajo `app/(app)/`, la regla de que toda pantalla con sesión va en ese grupo, el uso de `useUnsavedWork` para el trabajo pendiente, y las secciones `/dashboard?section=<id>`
- [ ] T037 [P] Actualizar `README.md`: el menú siempre visible en la lista de funciones
- [ ] T038 [P] Actualizar `MANUAL_USUARIO.md`: en "El Dashboard", el menú siempre visible, la ruta de migas, y la pregunta al salir con trabajo sin guardar
- [ ] T039 Correr `npx tsc --noEmit`, `npm run lint` y `npm run build`, obligatorio porque se mueven rutas. Si `tsc` falla solo por copias `* 2.ts` de iCloud en `.next`, eliminarlas y repetir (Principio VI)
- [ ] T040 Comprobar en el navegador integrado, sin sesión: `/` y `/reset-password` sin menú, y `/dashboard?section=grammar` envía a `/` sin mostrar el menú (quickstart, escenario 1, pasos 6 y 7)
- [ ] T041 Si hace falta para que el servidor del dueño tome las rutas movidas, pedirle confirmación y reiniciarlo
- [ ] T042 [Usuario] Ejecutar los escenarios 1 y 5 de [quickstart.md](./quickstart.md): el menú en cada pantalla, la sección activa, recargar las 6 secciones, la ruta de migas, "← Back" y el destino al terminar (SC-001, SC-005)
- [ ] T043 [Usuario] Ejecutar los escenarios 2 y 3: la pregunta en cada caso de la tabla, "Stay" sin cambios, "Leave", la ruta de migas y "Log out" con trabajo pendiente, el aviso al recargar, y las salidas sin pregunta (SC-002, SC-003, SC-004)
- [ ] T044 [Usuario] Ejecutar el escenario 4: el audio y el micrófono se detienen al salir
- [ ] T045 [Usuario] Ejecutar el escenario 6: el recorrido de todos los módulos sin pasos nuevos, cambiar de nivel desde una lección, Talk con la barra sin tapar el menú, 1280 píxeles sin desplazamiento horizontal y la ventana estrecha (SC-006, SC-007)
- [ ] T046 Repetir los conteos de T002 y compararlos, anotando lo que guardó el dueño al completar actividades en T045 (SC-008)
- [ ] T047 Actualizar el Principio VI en `plan.md` y anotar en `quickstart.md` qué escenarios se verificaron y quién, solo con lo realmente comprobado

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Fase 1 (Setup)**: sin dependencias.
- **Fase 2 (Fundacional)**: depende de la 1. Bloquea a todas las historias, porque crea el marco y mueve las rutas.
- **Fase 3 (US1)**: depende de la 2.
- **Fase 4 (US2)**: depende de la 2, por `useUnsavedWork`. Puede avanzar a la vez que la 3, salvo T020, que toca el mismo archivo que T012.
- **Fase 5 (US3)**: depende de la 2, por `GuardedLink`. Sus tareas en `talk/page.tsx`, `ShadowSession.tsx` y `WritingAssistant.tsx` van después de las de las Fases 3 y 4 en esos archivos.
- **Fase 6**: depende de todas las anteriores.

### Dependencias dentro de cada historia

- **US1**: T009 antes de T010, porque tocan el mismo archivo.
- **US2**: en cada archivo, el trabajo pendiente antes de la limpieza (T014 y T015 antes de T025, T017 antes de T026).
- **US3**: T029 antes de T030 a T034.

### Oportunidades de paralelismo

- T003 y T004 son archivos nuevos e independientes.
- T014 a T019, T021, T022, T023, T024 y T027 tocan archivos distintos.
- T036, T037 y T038 tocan archivos distintos.
- `app/(app)/talk/page.tsx` concentra T011, T012, T020 y T032: esas van en secuencia.

## Ejemplo de paralelismo: trabajo pendiente en las fases

```text
T014 ComprehensionPhase.tsx
T015 ListeningPhase.tsx
T016 PracticePhase.tsx
T017 SpeakingPhase.tsx
T018 ExpressionPhase.tsx
T019 ChapterExpressionPhase.tsx
```

## Estrategia de implementación

### MVP (Fases 1 a 4, con US1 y US2)

El menú en todas las pantallas, con la confirmación al salir. Se entregan juntas para que el menú no haga más fácil perder trabajo. Se valida con T042 y T043.

### Entrega incremental

1. Fases 1 y 2: el marco común y las rutas movidas.
2. Fase 3: el menú en todas las pantallas y la sección al recargar.
3. Fase 4: la confirmación al salir, y el audio y el micrófono detenidos.
4. Fase 5: la ruta de migas.
5. Fase 6: documentación, barreras y comprobación final.

## Notas

- **Sin cambios de base de datos**: ninguna tarea toca el esquema, los seeds ni los datos. T002 y T046 solo leen.
- **Verificación con sesión**: el navegador integrado no tiene la sesión del dueño, así que T042 a T045 son suyas. Lo que no depende de la sesión se comprueba en T008 y T040.
- **Servidor del dueño**: corre desde esta copia del repositorio. Mover carpetas puede obligar a reiniciarlo, y eso se hace solo con su confirmación (T008, T041).
- **Trazabilidad**: FR-001 a FR-003 (T003, T005, T007); FR-004 (T003, T010); FR-005 (T005, T009); FR-006 (T007, T040); FR-007 a FR-010 (T029 a T035); FR-011 a FR-016 (T004, T014 a T022); FR-017 (T011, T012, T023 a T027, T045); FR-018 (T002, T046). SC-001 y SC-005 en T042; SC-002 a SC-004 en T043; SC-006 y SC-007 en T045; SC-008 en T046.
