# Tareas: Módulo Tools y Writing Assistant

**Entrada**: Documentos de diseño en `/specs/004-writing-assistant/`

**Prerrequisitos**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes)

**Pruebas**: el proyecto no tiene suite automatizada y la spec no la pide (Principio VI), así que no se generan tareas de prueba automatizada. La verificación es manual, según [quickstart.md](./quickstart.md), más `tsc`, lint y build.

**Organización**: las tareas se agrupan por historia de usuario, pero las fases siguen el "Orden de implementación recomendado" de [plan.md](./plan.md), no la prioridad: la lógica de palabras y su medición van primero, porque si no cumplen SC-004 cambia el diseño.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: se puede hacer en paralelo (archivo distinto, sin dependencias pendientes).
- **[Story]**: a qué historia de usuario pertenece. US1: inspector de sentido. US2: palabras en rojo. US3: arreglarlas todas. US4: módulo Tools.
- **[Usuario]**: la verificación la debe hacer el dueño, porque requiere su sesión. No se marca sin su resultado.

## Convenciones de ruta

Next.js 16 App Router, un solo proyecto; rutas relativas a la raíz del repositorio, según [plan.md](./plan.md).

## Reglas que aplican a todas las fases

- **Nunca** `npm run db:reset`, `supabase db reset` ni `supabase stop --no-backup`. Esta funcionalidad no cambia la base de datos.
- Solo web, para navegador de escritorio. Sin requisitos de móvil ni de pantallas táctiles.
- Los textos que ve el estudiante van en inglés, tal cual los de [contracts/writing-assistant.md](./contracts/writing-assistant.md).
- Comentarios en el código solo para explicar un porqué que no sea obvio.
- No leer `.env.local` completo ni imprimir secretos.
- Sin commit ni push hasta que el dueño lo pida.

---

## Fase 1: Setup (dependencia y diccionarios)

**Propósito**: dejar disponibles `nspell` y los archivos de diccionario. Depende de que la rama incluya 003.

- [X] T001 Confirmar con `grep` que `lib/api-guard.ts`, `lib/api.ts` y `components/SessionNotice.tsx` existen en la rama. Si faltan, detenerse y avisar, porque 003 es requisito
- [X] T002 Instalar `nspell@2.1.5` como dependencia y `@types/nspell@2.1.6` como dependencia de desarrollo en `package.json` y `package-lock.json`
- [X] T003 Copiar `index.aff` e `index.dic` de `dictionary-en@4.0.0` a `public/dictionaries/en/`, descargando el paquete en el directorio temporal de la sesión, fuera del repositorio. No agregarlo a `package.json`
- [X] T004 Generar `public/dictionaries/en/common-words.json`, un arreglo donde el orden indica la frecuencia: primero las palabras de `english-words-10`, `-20` y `-35` de `wordlist-english@1.2.1` en ese orden de bandas, y dentro de cada banda según su frecuencia en las lecciones (`scenario_phases`, `chapter_phases` y `vocabulary`, de solo lectura). El script es temporal y no se versiona (research §3)
- [X] T005 Crear `public/dictionaries/en/LICENSE` con los avisos completos de `dictionary-en` y de `wordlist-english` (SCOWL), que la licencia exige conservar

---

## Fase 2: Fundacional (lógica de palabras y medición)

**Propósito**: la revisión de palabras, sin interfaz. Es la base de US2 y US3.

**⚠️ CRÍTICO**: si T011 no cumple SC-004, se detiene todo y se avisa al dueño antes de construir la interfaz.

- [X] T006 Crear `lib/spelling/allowed-terms.ts` con los términos de research §4, sin distinguir mayúsculas: `handoff`, `counterproposal`, `runbook`, `async`, `standup`, `config`, `mortem`, `backend`, `changelog`, `microservices`, `failover`, `dev`, `api`, `frontend`, `env`, `timezones`, `cancelled`, `hotfix`, `repo`, `codebase`; y una tabla corta de contracciones sin apóstrofo (`dont`, `doesnt`, `didnt`, `isnt`, `arent`, `wasnt`, `werent`, `couldnt`, `wouldnt`, `shouldnt`, `im`, `ive`) con su forma correcta
- [X] T007 Crear `lib/spelling/tokens.ts`, con la función que separa el texto en palabras con su `start` y `end`, conservando las posiciones exactas (FR-018). No revisa una palabra si: está toda en mayúsculas, tiene mayúsculas internas, contiene dígitos, `_`, `/`, `.` interno, `@` o `://`, va entre comillas invertidas, empieza con mayúscula en medio de una oración, o está en los términos permitidos. Las partes con guion se revisan por separado, y se aceptan prefijos cortos como `de` en `de-escalate` (research §4). Normaliza el apóstrofo curvo `’` a `'` solo para revisar
- [X] T008 Crear `lib/spelling/checker.ts` con `loadChecker(): Promise<SpellChecker>`, según [el contrato](./contracts/writing-assistant.md): `import()` dinámico de `nspell`, `fetch` de los 3 archivos de `/dictionaries/en/`, y carga una sola vez, con la promesa guardada a nivel de módulo
- [X] T009 En `lib/spelling/checker.ts`, implementar `findMisspellings(text, caret)`: devuelve `{ start, end, word }` por cada aparición mal escrita. Omite la palabra que termina justo en `caret` sin un separador detrás (FR-015); con `caret` en `null`, revisa todas
- [X] T010 En `lib/spelling/checker.ts`, implementar `suggest(word)`: hasta 5 opciones, con la tabla de contracciones primero, y luego los candidatos de `nspell` más las transposiciones válidas, ordenados por menor distancia de edición (una transposición cuenta como un solo cambio), después por posición en `common-words.json` y por último por el orden original. Conserva la mayúscula inicial de la palabra original, y guarda el resultado por palabra (research §3)
- [X] T011 Medir SC-004 con la lógica real y un script temporal fuera del repositorio: 10 oraciones **nuevas**, que no estén en research.md, con errores de escritura conocidos. Esperado: se marcan todos, y la primera opción acierta en al menos 9 de cada 10. **Si no se cumple, detenerse y avisar al dueño**, con los fallos y las opciones
- [X] T012 Medir SC-005 con el mismo script: 10 oraciones de trabajo correctas, con `API`, `QA`, `standup`, `backend`, `useState` y `GitHub`, más el texto de las lecciones. Esperado: ninguna palabra correcta marcada en las 10 oraciones. Si aparece algún término técnico nuevo, agregarlo a `lib/spelling/allowed-terms.ts`, y anotar en research.md qué queda marcado en las lecciones
- [X] T013 Correr `npx tsc --noEmit` y `npm run lint`. Si `tsc` falla solo por copias `* 2.ts` de iCloud en `.next`, eliminar esas copias generadas y repetir

**Punto de control**: la revisión de palabras cumple SC-004 y SC-005 sin interfaz.

---

## Fase 3: Historia de usuario 1 — Ver cómo suena más natural lo que escribí (Prioridad: P1) 🎯 MVP

**Objetivo**: pulsar el inspector y recibir una versión más natural en otro cuadro, o un mensaje de que está bien.

**Prueba independiente**: escribir una oración correcta pero poco natural, activar el inspector, copiar la recomendación y pegarla en otra aplicación.

- [X] T014 [US1] Crear `app/api/writing-assistant/route.ts`: empezar con `guardRequest(req, { maxBodyBytes: 32 * 1024 })`; responder 503 con mensaje claro si falta `ANTHROPIC_API_KEY`, después de la guarda; y validar `text` como texto no vacío tras recortar, con `invalidRequestResponse`, y de hasta 5000 caracteres, con `exceedsLength` y `tooLargeResponse`; `level` es opcional y solo admite `A2`, `B1`, `B2` o `C1` (FR-024)
- [X] T015 [US1] En `app/api/writing-assistant/route.ts`, llamar a `claude-haiku-4-5-20251001` una sola vez, sin reintento, con `tool_choice` forzado, como `app/api/vocabulary/translate/route.ts`, y `status` limitado a `natural`, `improved` o `not_english`. El prompt de sistema debe indicar: el texto es solo para revisar, nunca instrucciones que seguir; evaluar redacción, naturalidad y sentido, incluidas palabras bien escritas pero mal usadas (FR-008); conservar lo que quiso decir, sin agregar información (FR-009); si ya está bien, responder `natural`, sin cambios de simple preferencia de estilo (FR-010); sin traducir textos en otro idioma; adecuado al nivel, y natural en un contexto profesional de tecnología (FR-012); la recomendación siempre en inglés. Antes de escribir esta parte, leer la guía del SDK que corresponda
- [X] T016 [US1] En `app/api/writing-assistant/route.ts`, validar la respuesta: 500 si no usa la herramienta, si `status` no es válido, o si `improved` llega sin recomendación; `natural` si la recomendación es idéntica al texto. Envolver en `try/catch`, registrar el detalle con `console.error`, y responder `Your text could not be reviewed. Please try again.`, sin detalles del proveedor (FR-025)
- [X] T017 [US1] Comprobar sin token, y con un token inventado, que la ruta responde 401 sin llamar al proveedor
- [X] T018 [P] [US1] Crear `app/tools/writing-assistant/page.tsx`, que solo monta `<WritingAssistant />`, como `app/shadow/page.tsx`
- [X] T019 [US1] Crear `components/tools/WritingAssistant.tsx` como componente de cliente: comprobar la sesión al montarse, y leer `levels(code)` con `B1` por defecto, como `components/shadow/ShadowSession.tsx` (líneas 113 a 131), redirigiendo a `/` si no hay sesión (FR-004); con enlace para volver a `/dashboard` y margen inferior para que `FloatingVocabulary` no tape los botones
- [X] T020 [US1] En `components/tools/WritingAssistant.tsx`, agregar un `<textarea>` provisional con el marcador `Write or paste your text in English…`, y el aviso `This text is too long. Please shorten it and try again.` por encima de 5000 caracteres, sin enviar nada y sin perder el texto (FR-005, FR-006)
- [X] T021 [US1] En `components/tools/WritingAssistant.tsx`, implementar el botón `Check sentence meaning` con los estados de [data-model.md](./data-model.md) `idle`, `checking`, `natural`, `improved`, `not_english` y `error`. Llama a `postJson('/api/writing-assistant', { text, level })` una vez por clic, muestra `Checking…`, queda **deshabilitado** mientras revisa, y también sin texto o por encima del límite (FR-007, FR-014). Cancelar con `AbortController` al salir de la página
- [X] T022 [US1] En `components/tools/WritingAssistant.tsx`, mostrar el resultado en un cuadro separado, sin modificar el texto del estudiante (FR-009, FR-011): la recomendación; `This sentence looks good.` si el texto revisado tiene una oración y `This paragraph looks good.` si tiene varias (FR-010); o `Writing Assistant only reviews English.`
- [X] T023 [US1] En `components/tools/WritingAssistant.tsx`, guardar `reviewedText` y mostrar `This recommendation is for an earlier version of your text.` si difiere del texto actual, también si cambió durante la revisión. Si una nueva revisión falla, retirar la recomendación anterior
- [X] T024 [US1] En `components/tools/WritingAssistant.tsx`, agregar `Copy recommendation`, disponible solo en `improved`: copia únicamente la recomendación con `navigator.clipboard.writeText` y muestra `Copied` (FR-013). Si falla, muestra `Could not copy. Select the text and copy it manually.`
- [X] T025 [US1] En `components/tools/WritingAssistant.tsx`, manejar los errores: leer `error` de la respuesta, mostrar `Could not reach the server. Check your connection and try again.` si falla la red, y conservar siempre el texto. Sesión vencida: el aviso ya existente lo muestra `postJson` (FR-025, SC-008)
- [X] T026 [US1] Correr `npx tsc --noEmit` y `npm run lint`
- [X] T027 [US1] **[Usuario]** Ejecutar el escenario 2 de [quickstart.md](./quickstart.md) con su sesión, incluido que los textos correctos reciban el mensaje y ninguna sugerencia (SC-002, SC-006, FR-010)

**Punto de control**: el inspector funciona de principio a fin.

---

## Fase 4: Historia de usuario 4 — Encontrar las herramientas en el menú (Prioridad: P1)

**Objetivo**: llegar al Writing Assistant desde el menú.

**Prueba independiente**: abrir el menú, entrar a Tools, abrir la herramienta y volver.

- [X] T028 [US4] En `app/dashboard/page.tsx`, agregar `'tools'` al tipo `DashboardView` (línea 51), y `{ id: 'tools', label: 'Tools', description: 'Writing and more' }` al arreglo del menú (líneas 331 a 337), entre Shadowing y Progress (FR-001)
- [X] T029 [US4] En `app/dashboard/page.tsx`, agregar la sección `activeView === 'tools'` con el mismo marcado de tarjetas que `activeView === 'talk'` (línea 363), a partir de un arreglo de herramientas con `id`, `eyebrow`, `title`, `description` y `href`. Por ahora, solo `Writing Assistant`, con `Open Writing Assistant →`, que hace `router.push('/tools/writing-assistant')` (FR-002, FR-003)
- [X] T030 [US4] Correr `npx tsc --noEmit` y `npm run lint`
- [X] T031 [US4] **[Usuario]** Ejecutar el escenario 1 de [quickstart.md](./quickstart.md) con su sesión: los módulos existentes siguen igual, y son 2 clics en total (SC-001)

**Punto de control**: el MVP está completo (US1 y US4).

---

## Fase 5: Historia de usuario 2 — Ver y corregir las palabras mal escritas (Prioridad: P2)

**Objetivo**: palabras en rojo mientras se escribe, con opciones con clic derecho.

**Prueba independiente**: escribir un texto con errores, ver las marcas sin pulsar nada, y corregir una con clic derecho.

- [X] T032 [US2] Crear `components/tools/SpellCheckedTextarea.tsx` con la capa de research §5: un `<div>` detrás con la misma tipografía, tamaño, relleno y ancho, que repite el texto y envuelve las marcadas en `<mark>` en rojo con subrayado ondulado; y el `<textarea>` encima, con fondo y texto transparentes y `caret-color` visible
- [X] T033 [US2] En `components/tools/SpellCheckedTextarea.tsx`, poner `spellCheck={false}`, `autoCorrect="off"` y `autoCapitalize="off"` (FR-016), sincronizar el desplazamiento con `onScroll`, y usar `overflow-y: scroll` en las dos capas para que las líneas no se descuadren
- [X] T034 [US2] En `components/tools/SpellCheckedTextarea.tsx`, revisar el texto en cada cambio con `findMisspellings` y marcar de inmediato las palabras terminadas (FR-015, SC-003). La palabra que termina en el cursor se evalúa tras 700 ms sin escribir
- [X] T035 [US2] En `components/tools/WritingAssistant.tsx`, sustituir el `<textarea>` provisional de T020 por `SpellCheckedTextarea`, y cargar `loadChecker()` al montarse. Si falla, mostrar `The spell checker is not available right now. You can still check the sentence meaning.`, sin marcas, y con el inspector disponible
- [X] T036 [US2] En `components/tools/SpellCheckedTextarea.tsx`, implementar `onContextMenu`: comparar las coordenadas con `getClientRects()` de cada `<mark>`. Si cae sobre una marca, `preventDefault()` y abrir el menú propio con hasta 5 opciones, o `No suggestions`; si no, no hacer nada, para conservar el menú habitual (FR-017, FR-019, FR-021)
- [X] T037 [US2] En `components/tools/SpellCheckedTextarea.tsx`, cerrar el menú con `Esc`, al hacer clic fuera, o si el texto cambia. Al elegir, comprobar que `text.slice(start, end)` siga siendo la misma palabra, reemplazar solo esa aparición (FR-018), y dejar el cursor en una posición coherente
- [X] T038 [US2] Correr `npx tsc --noEmit` y `npm run lint`
- [X] T039 [US2] Comprobar el escenario 3 de [quickstart.md](./quickstart.md) en el navegador con una página temporal que monte `SpellCheckedTextarea` sin sesión: marcas sin mover el cursor, palabra a medio escribir, clic derecho dentro y fuera de una marca, texto largo con desplazamiento, y menú abierto al cambiar el texto. Mirar también la consola. **Eliminar la página temporal al terminar**, sin versionarla

**Punto de control**: las palabras se marcan y corrigen una a una.

---

## Fase 6: Historia de usuario 3 — Arreglar todas las palabras de una vez (Prioridad: P3)

**Objetivo**: un botón que arregla todas las marcadas, y que se puede deshacer.

**Prueba independiente**: con varias palabras marcadas, pulsar el botón y deshacer.

- [X] T040 [US3] En `components/tools/WritingAssistant.tsx`, agregar `Fix all`, disponible solo con alguna marca (FR-020). Reemplaza cada palabra con su primera opción, de la última a la primera para que las posiciones sigan siendo válidas, y omite las que no tienen opciones, que siguen marcadas (FR-021)
- [X] T041 [US3] En `components/tools/WritingAssistant.tsx`, guardar `{ before, after }` y mostrar `Undo` solo mientras el texto sea igual a `after`. `Undo` restaura `before` exactamente (FR-022, SC-009)
- [X] T042 [US3] Correr `npx tsc --noEmit` y `npm run lint`
- [X] T043 [US3] Comprobar el escenario 4 de [quickstart.md](./quickstart.md) en el navegador con una página temporal, comparando el texto tras `Undo` con el original. **Eliminar la página temporal al terminar**, sin versionarla

**Punto de control**: las cuatro historias funcionan.

---

## Fase 7: Pulido y comprobación final

- [X] T044 [P] Actualizar `AGENTS.md`: `app/tools/` y `components/tools/` en la estructura, `app/api/writing-assistant` en la fila de `ANTHROPIC_API_KEY`, y `lib/spelling/`, con la nota de que la revisión de palabras no gasta créditos
- [X] T045 [P] Actualizar `README.md`: agregar el Writing Assistant a las funciones
- [X] T046 [P] Actualizar `MANUAL_USUARIO.md`: agregar Tools a las vistas del dashboard, y una sección corta en español sobre el Writing Assistant
- [X] T047 Correr `npx tsc --noEmit`, `npm run lint` y `npm run build`, obligatorio por añadir rutas y una dependencia. Si `tsc` falla solo por copias `* 2.ts` de iCloud en `.next`, eliminar esas copias generadas y repetir (Principio VI)
- [X] T048 Ejecutar los pasos sin sesión del escenario 5 de [quickstart.md](./quickstart.md): 401 sin token y con un token inventado. Comprobar con `grep` que el Writing Assistant no usa `fetch` directo a `/api`, y que no quedan páginas temporales con `git status`
- [X] T049 Comprobar SC-010: comparar los conteos por tabla antes y después del recorrido, de solo lectura. Esperado: iguales, salvo lo que el dueño haga en otras partes de la app
- [ ] T050 **[Usuario]** Ejecutar el escenario 5 de [quickstart.md](./quickstart.md) con su sesión: más de 5000 caracteres en pantalla, sesión vencida con el texto intacto, y llave de Anthropic inválida, que debe **restaurar al terminar** (FR-024, FR-025, SC-008)
- [ ] T051 **[Usuario]** Ejecutar el escenario 6 de [quickstart.md](./quickstart.md): escribir sin pulsar el botón no llama a la ruta (SC-007)
- [X] T052 Actualizar `specs/004-writing-assistant/plan.md` con el estado del Principio VI, y anotar en `quickstart.md` qué escenarios se verificaron y quién los hizo, solo con lo realmente comprobado (Principio VI)

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Fase 1 (Setup)**: sin dependencias de esta funcionalidad, pero requiere 003 en la rama.
- **Fase 2 (Fundacional)**: depende de la 1. **T011 es una barrera**: si no cumple SC-004, no se sigue.
- **Fase 3 (US1)**: depende de la Fase 1 solo por T001. No usa la lógica de palabras.
- **Fase 4 (US4)**: depende de que exista la página, creada en T018.
- **Fase 5 (US2)**: depende de las Fases 2 y 3, porque sustituye el cuadro provisional.
- **Fase 6 (US3)**: depende de la Fase 5.
- **Fase 7**: depende de todas las anteriores.

### Dependencias dentro de cada historia

- **US1**: la ruta (T014 a T017) antes de la interfaz (T019 a T025).
- **US2**: la capa (T032 a T034) antes del menú (T036 y T037).
- **US3**: `Fix all` (T040) antes de `Undo` (T041).

### Oportunidades de paralelismo

- T018 es un archivo nuevo e independiente.
- T044, T045 y T046 tocan archivos distintos.
- US1 y las Fases 1 y 2 podrían avanzar a la vez, pero el orden recomendado mide primero porque su resultado puede cambiar el diseño.
- `components/tools/WritingAssistant.tsx` y `app/dashboard/page.tsx` concentran muchas tareas: esas van en secuencia.

## Ejemplo de paralelismo: documentación final

```text
T044 AGENTS.md
T045 README.md
T046 MANUAL_USUARIO.md
```

## Estrategia de implementación

### MVP (Fases 1 a 4, con US1 y US4)

Tools en el menú y el inspector de sentido funcionando. Ya da la parte de más valor, aunque las palabras todavía no se marquen. Se valida con T027 y T031.

### Entrega incremental

1. Fases 1 y 2: la lógica de palabras y su medición. Si T011 falla, se decide con el dueño antes de seguir.
2. Fases 3 y 4: el MVP.
3. Fase 5: palabras en rojo y clic derecho.
4. Fase 6: `Fix all` y `Undo`.
5. Fase 7: documentación, barreras y comprobación final.

## Notas

- **Sin cambios de base de datos**: ninguna tarea toca el esquema, los seeds ni los datos. T004 y T049 solo leen.
- **Enmienda del Principio II**: la lista de rutas de la constitución debe incluir `writing-assistant`, y ya le falta `shadow/generate`. Es una enmienda PARCHE que aprueba el dueño en un cambio aparte, y no genera tareas de código.
- **Dependencia de 003**: hay que fusionar 003 en `main` antes que 004.
- **Límite conocido**: `Cmd+Z` puede no recuperar una palabra cambiada desde el menú; `Undo` cubre `Fix all` (research §7). Un nombre propio al inicio de una oración se marca (research §4).
- **Verificación con sesión**: el navegador integrado no tiene la sesión del dueño, así que T027, T031, T050 y T051 son suyas. Lo que no depende de la sesión se comprueba con páginas temporales (T039, T043).
- **Trazabilidad**: FR-001 a FR-004 (T019, T028, T029); FR-005 y FR-006 (T020); FR-007 a FR-014 (T014 a T016, T021 a T024); FR-015 a FR-019 (T007, T009, T032 a T037); FR-020 a FR-022 (T036, T040, T041); FR-023 (T008, T009, T051); FR-024 a FR-026 (T014, T016, T025, T049, T050). SC-001 en T031; SC-002 y SC-006 en T027; SC-003 en T034 y T039; SC-004 en T011; SC-005 en T012; SC-007 en T051; SC-008 en T050; SC-009 en T043; SC-010 en T049.
