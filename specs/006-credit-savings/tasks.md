# Tareas: Ahorro de créditos de IA y audio

**Entrada**: Documentos de diseño en `/specs/006-credit-savings/`

**Prerrequisitos**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes)

**Pruebas**: el proyecto no tiene suite automatizada y la spec no la pide (Principio VI), así que no se generan tareas de prueba automatizada. La verificación es manual, según [quickstart.md](./quickstart.md), más un script temporal fuera del repositorio para el módulo de audio, y `tsc`, lint y build.

**Organización**: las tareas se agrupan por historia de usuario, pero las fases siguen el "Orden de implementación recomendado" de [plan.md](./plan.md): primero el audio (Historia 2), porque su módulo se prueba solo y sin gastar créditos, y luego Talk (Historia 1). Las dos historias son P1 e independientes: tocan archivos distintos.

## Formato: `[ID] [P?] [Story] Descripción`

- **[P]**: se puede hacer en paralelo (archivo distinto, sin dependencias pendientes).
- **[Story]**: a qué historia de usuario pertenece. US1: Talk espera al botón. US2: audio reutilizado.
- **[Usuario]**: la verificación la debe hacer el dueño, porque requiere su sesión. No se marca sin su resultado.

## Convenciones de ruta

Next.js 16 App Router, un solo proyecto; rutas relativas a la raíz del repositorio, según [plan.md](./plan.md).

## Reglas que aplican a todas las fases

- **Nunca** `npm run db:reset`, `supabase db reset` ni `supabase stop --no-backup`. Esta funcionalidad no cambia la base de datos.
- Solo web, para navegador de escritorio. Sin requisitos de móvil ni de pantallas táctiles.
- Los textos que ve el estudiante van en inglés, tal cual los de [contracts/tts.md](./contracts/tts.md).
- `guardRequest` sigue siendo lo primero en `/api/tts`: ningún audio, ni guardado, sale sin sesión (003).
- Ningún archivo de audio entra al repositorio.
- Comentarios en el código solo para explicar un porqué que no sea obvio.
- No leer `.env.local` completo ni imprimir secretos.
- Sin commit ni push hasta que el dueño lo pida.

---

## Fase 1: Setup

**Propósito**: confirmar el punto de partida y guardar las referencias.

- [X] T001 Confirmar que la rama parte de `main` con 005 fusionada (`git merge-base --is-ancestor origin/main HEAD`) y que existen `app/(app)/talk/page.tsx`, `app/api/tts/route.ts` y `components/navigation/NavigationGuard.tsx`. Si no, detenerse y avisar
- [X] T002 Guardar los conteos de filas de cada tabla de `public` y de `auth.users`, solo de lectura con `psql`, en el directorio temporal de la sesión, para compararlos en T024 (FR-015)
- [X] T003 Anotar si existe `~/Library/Caches/english-code/tts/`, cuántos archivos tiene y cuánto ocupa, solo de lectura

---

## Fase 2: Fundacional

Sin tareas: las dos historias tocan archivos distintos y no comparten código.

---

## Fase 3: Historia de usuario 2 — Repetir un audio sin volver a pedirlo (Prioridad: P1)

**Objetivo**: que `/api/tts` reutilice el audio ya generado para la misma voz, el mismo modelo, los mismos ajustes y el mismo texto, también entre recargas y días.

**Prueba independiente**: en Shadowing, escuchar una palabra, fallar, pulsar "Listen again" y la opción lenta, y ver en la pestaña de red que solo la primera respuesta tiene `X-Audio-Source: generated`.

- [X] T004 [US2] Crear `lib/tts-cache.ts` según [contracts/tts.md](./contracts/tts.md) y [data-model.md](./data-model.md), solo con módulos `node:` (`crypto`, `fs/promises`, `os`, `path`):
  - `normalizeText(text)`: "quitar espacios al inicio y al final, y reducir a uno los espacios seguidos. Mayúsculas y puntuación se conservan".
  - `audioKey({ voiceId, modelId, settings, text })`: SHA-256 en hexadecimal de esos valores serializados, con el texto normalizado.
  - `readSavedAudio(key, options?)`: devuelve el contenido del archivo `<key>.mp3` y actualiza su fecha de modificación (último uso); si no existe, devuelve `null`; si está vacío o no se puede leer, lo borra y devuelve `null`.
  - `saveAudio(key, audio, options?)`: crea la carpeta si falta, escribe en un archivo temporal propio y lo renombra a `<key>.mp3`; después, si la carpeta supera el límite, borra los `.mp3` de fecha de modificación más antigua hasta quedar en el 90 % o menos. Cualquier fallo se registra con `console.error` y no se lanza.
  - Constantes: carpeta `~/Library/Caches/english-code/tts/` en macOS y `<carpeta temporal del sistema>/english-code-tts` en otros sistemas; límite de 200 MB; recorte al 90 %. `options` admite `{ dir, maxBytes }` solo para el script de prueba (FR-008, FR-011, FR-012, research §2 a §5)
- [X] T005 [US2] Probar `lib/tts-cache.ts` con un script temporal en el directorio temporal de la sesión, ejecutado con `node` (Node 24 ejecuta TypeScript), con una carpeta temporal y un límite pequeño: guardar y leer el mismo audio; el mismo texto con espacios distintos da la misma clave y con otra mayúscula, otra clave; otra voz, otra clave; un archivo vacío y uno ilegible devuelven `null` y se borran; al superar el límite se borran primero los de último uso más antiguo hasta el 90 %; un fallo de escritura no lanza error. No se versiona (quickstart, escenario 3, pasos 1 y 2)
- [X] T006 [US2] En `app/api/tts/route.ts`, después de `guardRequest` y de validar el texto: normalizar el texto con `normalizeText` y usarlo tanto para decidir si es corto como para pedir el audio; calcular la clave con la voz, el modelo, `language_code` cuando lo hay y `voice_settings`; devolver el audio guardado si `readSavedAudio` lo encuentra; si no, compartir la petición en curso para la misma clave con un `Map` de promesas a nivel de módulo, que se limpia al terminar; al recibir el audio de ElevenLabs, guardarlo con `saveAudio` y devolverlo. Respuestas 200 con `Content-Type: audio/mpeg`, la `Cache-Control` actual y `X-Audio-Source: generated` solo en la petición que llamó al proveedor, y `saved` en todas las demás. Los errores no cambian y, si falla el proveedor, no se guarda nada (FR-008 a FR-013, contracts/tts.md)
- [X] T007 [US2] Correr `npx tsc --noEmit` y `npm run lint`, y comprobar con `curl` que `/api/tts` responde 401 sin token y con un token inventado, antes de leer ningún audio guardado (quickstart, escenario 3, paso 4)
- [X] T008 [US2] **[Usuario]** Ejecutar los pasos 1 a 4 del escenario 2 de [quickstart.md](./quickstart.md): una palabra de Shadowing repetida, el diálogo de Listening dos veces, otras repeticiones, mismo sonido y menos de medio segundo (SC-003, SC-004, SC-005). Hecho el 2026-11-17, con la carpeta de audio como evidencia: el diálogo de Listening creó 6 audios en su primera reproducción y los 6 se reutilizaron en la segunda; en Shadowing cada palabra se generó una sola vez y 10 se reprodujeron de nuevo desde la copia guardada. El dueño informó que el sonido es el mismo
- [X] T009 [US2] Revisar en `~/Library/Caches/english-code/tts/` que los archivos de las pruebas de T008 existen y no están vacíos, y con `git status` que ninguno está en el repositorio (quickstart, escenario 3, paso 5). Hecho el 2026-11-17: 25 archivos `.mp3`, ninguno vacío (el menor, 12 KB), 1,2 MB en total, y ninguno en el repositorio
- [X] T010 [US2] **[Usuario]** Con confirmación del dueño, reiniciar el servidor de desarrollo, y que el dueño repita el diálogo de Listening: todas las respuestas con `saved` (SC-007). Hecho el 2026-11-17: tras reiniciar el servidor, el dueño reprodujo el diálogo de Listening; el registro muestra unas 30 peticiones de audio de 30 a 100 ms, y la carpeta, los 6 audios del diálogo reutilizados sin crear ninguno nuevo

**Punto de control**: el audio se reutiliza en toda la app, y la ruta sigue exigiendo sesión.

---

## Fase 4: Historia de usuario 1 — Entrar a Talk with AI sin gastar créditos (Prioridad: P1)

**Objetivo**: que el modo "Talk with AI" no cree un tema hasta que el estudiante pulse **Start a new topic**.

**Prueba independiente**: entrar, recargar y salir sin ningún `POST /api/talk` ni `POST /api/tts`; pulsar el botón y ver que empieza como hoy.

- [X] T011 [US1] En `app/(app)/talk/page.tsx`, en `initializeTalk`, dejar de llamar a `startConversation` en el modo con palabras: cargar el perfil y las palabras como hoy, y poner `loadingTopic` en falso. El modo abierto no cambia (FR-001, FR-005, FR-006)
- [X] T012 [US1] En `app/(app)/talk/page.tsx`, derivar `waitingToStart = !isOpenMode && !topicTitle && !loadingTopic`. En ese estado, la tarjeta del tema muestra la categoría `New conversation`, el título `Ready for a new topic?`, la descripción `Start when you are ready. Every topic is different from your conversation history.` y un botón `Start a new topic` que llama a `handleNewTopic`, deshabilitado mientras `loadingTopic` o `sending`. El texto `Your next conversation is loading...` queda solo para cuando se prepara el tema (FR-002, FR-003)
- [X] T013 [US1] En `app/(app)/talk/page.tsx`, con `waitingToStart`, la etiqueta de la barra para responder dice `Start a new topic to begin`, y el cuadro de texto y el botón del micrófono quedan deshabilitados (contracts/tts.md)
- [X] T014 [US1] En `app/(app)/talk/page.tsx`, proteger `handleNewTopic` con un `ref` que se activa antes de cualquier `await` y se libera al terminar, para que dos clics rápidos creen un solo tema. Sirve para los dos botones, el de la tarjeta y **New topic** del encabezado (FR-004, FR-007, research §6)
- [X] T015 [US1] Correr `npx tsc --noEmit` y `npm run lint`, y revisar que `useUnsavedWork` de 005 sigue sin contar la pantalla de inicio como trabajo pendiente
- [X] T016 [US1] **[Usuario]** Ejecutar el escenario 1 de [quickstart.md](./quickstart.md): entrar, recargar y salir sin peticiones; el botón con 1 tema y 1 audio; el doble clic; recargar a media conversación; el modo abierto y **New topic** (SC-001, SC-002). Hecho el 2026-11-17: las dos recargas de las 20:32 no crearon ningún tema, pulsar el botón a las 20:33 creó 1 tema con 1 audio, y volver a Talk a las 20:54 no creó ninguno. El doble clic, la recarga a media conversación, el modo abierto y **New topic** se apoyan en el informe del dueño

**Punto de control**: las dos historias funcionan.

---

## Fase 5: Pulido y comprobación final

- [X] T017 [P] Actualizar `AGENTS.md`: `/api/tts` reutiliza el audio guardado con `lib/tts-cache.ts` en `~/Library/Caches/english-code/tts/`, con un límite de 200 MB; cambiar la voz, el modelo o los ajustes genera audios nuevos; y Talk with AI espera al botón para crear un tema
- [X] T018 [P] Actualizar `README.md`: en funciones, la reutilización del audio y el inicio de Talk con botón; en "Data and security", dónde se guardan los audios, que no entran al repositorio y que se pueden borrar sin perder datos
- [X] T019 [P] Actualizar `MANUAL_USUARIO.md`: en Talk with AI, el botón **Start a new topic**, y que recargar con una conversación a medias vuelve al inicio
- [X] T020 Correr `npx tsc --noEmit`, `npm run lint` y `npm run build`. Si `tsc` falla solo por copias `* 2.ts` de iCloud en `.next`, eliminarlas y repetir (Principio VI)
- [X] T021 Confirmar que el servidor del dueño tomó los cambios y que `/api/tts` y `/talk` responden; si hace falta reiniciarlo, pedirle confirmación antes
- [X] T022 [Usuario] Ejecutar el escenario 4 de [quickstart.md](./quickstart.md): Talk, Shadowing y una lección funcionan igual que antes, salvo el botón de inicio (SC-006). Hecho el 2026-11-17: el dueño informó que Talk, Shadowing y la lección funcionan igual; el registro muestra un ejercicio de Shadowing guardado
- [X] T023 Comprobar en el registro del servidor, durante las pruebas del dueño, que no hubo ningún `POST /api/talk` sin pulsar el botón (SC-001). Hecho el 2026-11-17: después de las 20:33 no hubo ninguna conversación nueva, aunque el dueño volvió a Talk
- [X] T024 Repetir los conteos de T002 y compararlos: solo deben cambiar por uso real (FR-015). Hecho el 2026-11-17: 1 conversación de Talk con su mensaje inicial, 2 palabras guardadas y 1 ejercicio de Shadowing, todo por uso real
- [X] T025 Actualizar el Principio VI en `plan.md` y anotar en `quickstart.md` qué escenarios se verificaron y quién, solo con lo realmente comprobado. Hecho el 2026-11-17

---

## Dependencias y orden de ejecución

### Dependencias entre fases

- **Fase 1 (Setup)**: sin dependencias.
- **Fase 3 (US2)**: depende de la 1.
- **Fase 4 (US1)**: depende de la 1. Es independiente de la 3 y podría hacerse antes o a la vez.
- **Fase 5**: depende de las Fases 3 y 4.

### Dependencias dentro de cada historia

- **US2**: T004 antes de T005 y T006; T006 antes de T007 a T010.
- **US1**: T011 a T014 tocan el mismo archivo y van en secuencia; T015 y T016 al final.

### Oportunidades de paralelismo

- Las Fases 3 y 4 tocan archivos distintos.
- T017, T018 y T019 tocan archivos distintos.

## Ejemplo de paralelismo: las dos historias

```text
Fase 3: lib/tts-cache.ts y app/api/tts/route.ts
Fase 4: app/(app)/talk/page.tsx
```

## Estrategia de implementación

### MVP (Fases 1 y 3)

El audio reutilizado en toda la app, que es donde se midió el mayor gasto (11 peticiones para una palabra). Se valida con T008.

### Entrega incremental

1. Fase 1: punto de partida.
2. Fase 3: audio reutilizado, probado primero con el script y luego en la app.
3. Fase 4: Talk espera al botón.
4. Fase 5: documentación, barreras y comprobación final.

## Notas

- **Sin cambios de base de datos**: ninguna tarea toca el esquema, los seeds ni los datos. T002 y T024 solo leen.
- **Verificación con sesión**: el navegador integrado no tiene la sesión del dueño, así que T008, T010, T016 y T022 son suyas. El módulo de audio se prueba sin sesión ni créditos en T005.
- **Créditos en las pruebas**: la primera reproducción de cada audio en T008 llama a ElevenLabs, y cada pulsación de **Start a new topic** en T016 llama a la IA y a ElevenLabs.
- **Trazabilidad**: FR-001 a FR-007 (T011 a T014); FR-008 a FR-013 (T004 a T006); FR-014 (T015, T022); FR-015 (T002, T024). SC-001 en T016 y T023; SC-002 en T016; SC-003 a SC-005 en T008; SC-006 en T022; SC-007 en T010.
