# Guía de validación — Talk with AI

Pasos para comprobar manualmente que el módulo cumple la spec ([spec.md](./spec.md)) de principio a fin. No sustituye al Principio VI (`npx tsc --noEmit`, `npm run lint` y `npm run build` si se tocan rutas o configuración).

**Estado de la verificación al 2026-11-01**:
- Los escenarios 4 y 5 (cambios recientes) y los pasos 4 y 5 del escenario 3 (FR-020, mensajes de micrófono) ya los **verificó el usuario en la aplicación corriendo** (T022, T023 y T027).
- El escenario 8 (correcciones de la convergencia, T032 a T037) está **pendiente de ejecutar** (T038); el Principio VI lo exige para dar la funcionalidad por terminada.

## Prerrequisitos

- Supabase local corriendo (`npx supabase status`; si no, `npx supabase start`). **Nunca** `supabase db reset` sobre una base con cuentas reales.
- `.env.local` con `ANTHROPIC_API_KEY` y `ELEVENLABS_API_KEY` (ver [README.md](../../README.md)).
- Chrome (u otro navegador con reconocimiento de voz), micrófono disponible y sesión iniciada.
- Para los escenarios 1 y 3: al menos 2 palabras guardadas en el widget de vocabulario, sin marcar como aprendidas.
- `npm run dev`.

## Escenario 1 — Conversación con vocabulario propio (Historia 1, P1)

1. Desde el dashboard, abrir "Talk with AI" → "Practice vocabulary".
2. Confirmar que aparece un título y una categoría, que la IA abre la conversación y que suena en voz alta (FR-001, FR-014).
3. Confirmar que las palabras guardadas aparecen en el panel "Words in this conversation" y resaltadas en los mensajes de la IA (FR-004).
4. Responder (hablando o escribiendo) y enviar; confirmar que el contador "Response N of 5" avanza (FR-006) y que cada turno de la IA en este modo termina con una pregunta directa (FR-011).
5. Tras la segunda respuesta, confirmar que aparece "Finish & feedback" (FR-007).
6. Enviar hasta la quinta respuesta y confirmar que la retroalimentación (resumen, fortalezas, mejoras, siguiente paso) aparece sola (FR-006, FR-009).
7. Marcar una palabra con "Mark learned" y confirmar que sale de la lista (FR-005).
8. Pulsar "New topic" y confirmar que el tema es distinto (FR-001, SC-005).

## Escenario 2 — Conversación abierta (Historia 2, P2)

1. Abrir "Open conversation". Confirmar que **no** hay panel de palabras y que la IA no habla primero (FR-008).
2. Enviar una pregunta propia y confirmar que la IA la responde sin cambiar de tema. En este modo la pregunta final es **opcional**: no es un fallo que algún turno no termine con una pregunta (FR-011).
3. Confirmar que "Finish topic & feedback" aparece desde la primera respuesta y que no hay tope de 5 (FR-007, FR-008).
4. Terminar y confirmar que se ofrece "New conversation".

## Escenario 3 — Responder por voz o texto (Historia 3, P2)

1. Pulsar "Start talking", decir una frase y confirmar que el texto aparece mientras se habla (FR-012).
2. Editar el texto, usar "Clear" o "Record again" y confirmar que solo se envía lo que quedó en el cuadro.
3. En un navegador sin voz (por ejemplo Firefox de escritorio), confirmar que se avisa y se puede escribir (FR-013).
4. **FR-020 (D1)**: escribir algo en el cuadro, denegar en la configuración del navegador el permiso del micrófono para el sitio y pulsar "Start talking". Esperado: un mensaje claro que pide permitir el micrófono, sin quedarse en "grabando", con lo escrito intacto y el cuadro disponible.
5. **FR-020, segundo caso**: sin micrófono conectado (o con la entrada de audio desactivada), pulsar "Start talking". Esperado: un mensaje **distinto** que pide conectar un micrófono, y se puede seguir escribiendo.

## Escenario 4 — Cuadro de respuesta más alto (cambio reciente, FR-019 y SC-007)

1. Abrir cualquiera de los dos modos y mirar el cuadro "Speak or type your answer in English…".
2. Confirmar que muestra **3 líneas** de texto a la vez (antes 2).
3. Escribir una respuesta de más de 3 líneas y confirmar que el cuadro no crece y que hace scroll por dentro.
4. Confirmar que la barra inferior no tapa el último mensaje de la IA (el relleno de la pantalla alcanza con el cuadro más alto, también si aparece el aviso de voz no disponible).

## Escenario 5 — Desplazamiento automático (cambio reciente, FR-017, FR-018 y SC-006)

1. Provocar un mensaje largo de la IA con la pantalla ya llena y confirmar que, **mientras el texto se escribe**, la pantalla baja sola y lo último nunca queda tapado por la barra de respuesta.
2. Confirmar lo mismo con el indicador "AI is thinking..." y con un error (por ejemplo, apagando temporalmente la llave de Anthropic en `.env.local` y reiniciando el servidor).
3. Con la IA hablando, subir a releer un mensaje anterior y confirmar que la pantalla **no** te arrastra de vuelta al final.
4. Enviar un mensaje y confirmar que vuelve a seguir el final.
5. Al terminar, confirmar que la tarjeta de retroalimentación se centra en pantalla sin pelearse con el seguimiento automático.

## Escenario 6 — Fallos y recuperación (Casos límite)

1. Con el servidor de IA caído, enviar una respuesta y confirmar que aparece el error, que el texto escrito no se pierde y que "Retry AI response" lo reenvía sin volver a grabar (FR-015).
2. Con el audio fallando, confirmar que el texto igualmente se escribe en pantalla, sin sonido.
3. Recargar la página y confirmar que empieza un tema distinto, y que la conversación anterior sigue en el historial (comprobar con una consulta de solo lectura a `ai_conversations`).

## Escenario 7 — Aislamiento de datos (FR-016, SC-008)

Con dos cuentas de prueba, confirmar que una no ve las conversaciones, mensajes ni palabras de la otra. Consulta de solo lectura útil: `select tablename, policyname from pg_policies where tablename in ('personal_vocabulary','ai_conversations','ai_conversation_messages');` debe mostrar las tres políticas descritas en [data-model.md](./data-model.md).

## Escenario 8 — Correcciones de la convergencia (T032 a T037)

Para simular fallos: en las herramientas de desarrollo de Chrome, pestaña Network, clic derecho sobre una petición a `/api/talk` → "Block request URL" (se quita igual). Para que el audio tarde, usar en esa pestaña la velocidad "Slow 3G".

1. **Pregunta opcional (FR-011)**: en "Open conversation", conversar varios turnos y confirmar que la IA no termina siempre con una pregunta. En "Talk with AI", confirmar que sigue terminando con una pregunta directa.
2. **Retroalimentación sin conexión (FR-009)**: con `/api/talk` bloqueada, pulsar "Finish & feedback". Esperado: un error claro, sin quedarse en "AI is thinking...". Quitar el bloqueo, pulsar de nuevo y confirmar que llega la retroalimentación.
3. **Saltar audio que aún carga (FR-014, SC-003)**: en "Slow 3G", pulsar "Skip audio →" apenas aparece un mensaje de la IA y confirmar que después no suena. Repetir un mensaje y, mientras carga, pedir otro: solo debe sonar el último, y "Skip audio →" debe seguir disponible.
4. **Editar mientras se graba (FR-012)**: pulsar "Start talking", hablar, editar el cuadro y seguir hablando. Esperado: la grabación se detiene, aparece "Record again" y lo editado no se reemplaza.
5. **Tema nuevo mientras se graba (FR-010)**: pulsar "Start talking" y luego "New topic" o "New conversation", y seguir hablando. Esperado: el cuadro queda vacío y aparece "Start talking".
6. **Sin sexta respuesta (FR-006)**: en "Talk with AI", bloquear `/api/talk` justo antes de enviar la quinta respuesta. Esperado: un error, y el cuadro, "Start talking" y el envío quedan deshabilitados. Quitar el bloqueo y confirmar que "Finish & feedback" entrega la retroalimentación.
