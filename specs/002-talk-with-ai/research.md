# Investigación — Fase 0: Talk with AI (decisiones del código actual)

*Actualizado el 2026-11-01 tras `/speckit-clarify`: D2 y D5 resueltas, D1 convertida en el requisito FR-020, implementado después en T021.*

Documento retroactivo: cada decisión describe lo que el código hace hoy, verificado en los archivos citados. En "Alternativas consideradas" **no consta qué se evaluó cuando se construyó el módulo** (no hay registro); lo que aparece son alternativas razonables para cuando el módulo cambie, marcadas como tales.

## 1. Dos modos en una sola pantalla

**Decisión**: una única pantalla (`app/talk/page.tsx`) sirve ambos modos; el modo lo decide la ruta (`usePathname() === '/talk/open'`) y `app/talk/open/page.tsx` solo la reexporta. El dashboard ofrece dos tarjetas que llevan a `/talk` y `/talk/open`.

**Justificación**: los dos modos comparten la mayor parte del comportamiento (voz, audio, historial, retroalimentación); separar la pantalla duplicaría ese código.

**Alternativas (a evaluar si cambia)**: pantallas separadas con componentes compartidos; es lo natural si los modos empiezan a divergir (ver Complexity Tracking en `plan.md`).

## 2. Una sola ruta de servidor con tres acciones

**Decisión**: `POST /api/talk` con `action` = `start` (elegir tema y abrir), `respond` (siguiente turno) o `feedback` (retroalimentación y cierre). La llave de Anthropic solo se lee en esa ruta (Principio II). Modelo Haiku 4.5; `start` con temperatura 1, `respond` 0.9 (0.5 en el segundo intento) y `feedback` 0.4.

**Justificación**: una sola puerta por integración (Principio II) y un único lugar donde vive el prompt del sistema (nivel CEFR, solo inglés, 45 a 90 palabras, regla de vocabulario).

**Alternativas (a evaluar)**: una ruta por acción; mayor claridad a cambio de repetir la preparación común.

## 3. Reglas de conversación por modo

**Decisión**:
- Modo vocabulario: hasta 10 palabras guardadas no aprendidas (las más antiguas primero); la IA debe usar cada una al menos una vez en sus primeros cuatro turnos. El estudiante responde hasta `MAX_USER_TURNS = 5` veces; al enviar la quinta, la pantalla pide la retroalimentación sola. El botón de terminar aparece desde la segunda respuesta.
- Modo abierto: no se envía ni se usa vocabulario; sin máximo de respuestas; el botón de terminar aparece desde la primera.

**Decisión confirmada en la clarificación del 2026-11-01 (D2, resuelta)**: la pregunta final es **obligatoria en el modo vocabulario** (el prompt exige "una pregunta directa que invite a responder") y **opcional en el modo abierto** ("pregunta solo cuando sea realmente útil"), porque ahí el estudiante lidera el tema. Primero se corrigió la spec (FR-011). El código solo lo cumplía a medias, porque la constante `system` seguía exigiendo la pregunta también en el modo abierto; `/speckit-converge` lo detectó y se corrigió en T032.

## 4. Tema nuevo y no repetido

**Decisión**: al abrir el modo vocabulario, el cliente lee los títulos de todas las conversaciones del estudiante y los envía como `previousTopics` (el servidor usa los últimos 80). Si la IA devuelve un título repetido, la base lo rechaza por la restricción única (`user_id`, `topic_key`, derivada del título normalizado) y el cliente reintenta una vez más con ese título agregado; si vuelve a fallar muestra "The AI repeated a previous topic".

**Justificación**: la base de datos es la garantía final; el envío de temas previos reduce los rechazos.

**Límite conocido (D4)**: la unicidad es por título, no por significado.

## 5. Persistencia: se guarda todo, menos la retroalimentación

**Decisión**: la conversación se crea al abrir (modo vocabulario) o al enviar el primer mensaje (modo abierto, con título genérico `Open conversation <fecha ISO>`); cada mensaje del estudiante y de la IA se guarda uno por uno; el mensaje de cierre de la IA también. La tarjeta de retroalimentación vive solo en pantalla.

**Consecuencia**: una conversación abandonada queda en el historial y su título cuenta como tema usado (modo vocabulario).

## 6. Entrada del estudiante: voz continua con texto editable

**Decisión**: reconocimiento de voz del navegador en modo continuo con resultados parciales, idioma `en-US`; el texto va a un cuadro editable y el estudiante revisa antes de enviar. Si el navegador no lo soporta, se avisa y se escribe. Los errores de reconocimiento (permiso denegado, sin micrófono) se manejan según FR-020 (D1, T021).

**Justificación**: mismo enfoque que `SpeakingPhase` y Shadowing; no requiere proveedor nuevo.

**Decisión de diseño para FR-020 (implementada en T021, verificada en pantalla en T022)**:
- Escuchar el evento de error del reconocimiento y distinguir dos casos: permiso denegado (`not-allowed` y `service-not-allowed`) y micrófono no encontrado (`audio-capture`).
- Mostrar el mensaje en la zona de la barra de respuesta donde ya se muestra el aviso de voz no disponible, como alerta accesible. Textos en inglés (la interfaz del estudiante va en inglés) y coherentes con Shadowing: "Microphone access was denied. Please allow microphone access and try again." y "No microphone was found. Connect one and try again."
- Al ocurrir el error, el estado de grabación vuelve a reposo (no a "revisión") y no se envía nada. Como grabar vacía el cuadro de respuesta, se restaura lo que el estudiante ya había escrito para que no lo pierda; el cuadro no se deshabilita, así que puede seguir escribiendo.
- Es el mismo enfoque que T025 de Shadowing, que vive en la rama `001-shadow-implement` y aún no está fusionada: conviene reutilizar el patrón, no inventar otro.

**Alternativas decididas en la clarificación**: un mensaje genérico único (opción B) y no hacer nada (opción C); se eligieron dos mensajes distintos (opción A) porque la acción del estudiante es distinta en cada caso.

## 7. Salida: texto revelado al ritmo del audio

**Decisión**: cada mensaje de la IA se pide a `/api/tts` (voz femenina) y el texto visible avanza según el progreso de reproducción; hay un tope de 45 segundos y, si el audio falla, el texto se escribe igual mediante una animación sin sonido. El estudiante puede saltar el audio, repetir cualquier mensaje y escuchar el título del tema y cada palabra guardada. Las palabras guardadas se resaltan en los mensajes de la IA. Cada reproducción lleva un identificador (`playbackIdRef`, T034): el audio que termina de cargar después de que el estudiante lo saltó o pidió otro no suena.

**Dependencia (D3)**: las palabras sueltas pasan por el mismo `/api/tts`; en esta rama aún puede pronunciarlas en español por azar. El arreglo está en la rama de Shadowing.

## 8. Desplazamiento automático (cambio reciente, FR-017 y FR-018)

**Decisión**: un oyente de scroll mantiene una bandera "pegado al final" (activa si el estudiante está a menos de 160 px del final del documento). Cuando cambian los mensajes, el texto visible de la IA, el estado "hablando", "pensando", la carga o el error, y la tarjeta de retroalimentación no está presente, la pantalla baja al final: instantáneo mientras la IA habla (para no encadenar animaciones) y suave en el resto. Al enviar un mensaje la bandera se reactiva. El relleno inferior de la pantalla deja la última línea sobre la barra de respuesta fija. La tarjeta de retroalimentación conserva su propio desplazamiento (centrarse).

**Alternativas**: reservar una zona con scroll propio para los mensajes (cambia el diseño de toda la pantalla); no se eligió por ser más invasivo.

## 9. Cuadro de respuesta (cambio reciente, FR-019)

**Decisión**: el cuadro tiene 3 filas visibles en lugar de 2. Con la tipografía actual eso pasa de unos 66 a unos 86 píxeles de alto (cálculo a partir del tamaño de letra y el relleno, no una medición en pantalla), un 30% más. No cambia de tamaño al escribir; si el texto lo supera, se desplaza dentro del cuadro.

**Alternativas**: que crezca solo con el contenido hasta un máximo; no se pidió.

## 10. Límites de contexto y reintentos

**Decisión**: la IA recibe como máximo los últimos 20 mensajes, cada uno recortado a 5000 caracteres; en `respond` además se descartan mensajes consecutivos idénticos, y esa acción reintenta una vez si falla. Si falla, el cliente conserva la respuesta del estudiante (`pendingHistory`) y ofrece "Retry AI response" sin volver a grabar. Si falla la retroalimentación, el estudiante puede volver a pulsar el botón de terminar.

**Límite aceptado (D5, clarificación 2026-11-01)**: en una conversación abierta larga la IA pierde el inicio. Se evaluaron ampliar la ventana (por ejemplo, a 40 mensajes) y resumir lo antiguo, y se descartaron por costo y complejidad sin una necesidad demostrada; queda escrito en la spec y se reabre solo si el uso real lo pide.

## 11. Verificación

**Decisión**: sin pruebas automatizadas (no hay suite); verificación manual con `quickstart.md`, `npx tsc --noEmit` y ESLint, según el Principio VI. El usuario ya verificó en la aplicación corriendo FR-020 (sección 6, T022), los cambios de las secciones 8 y 9 (T023 y T027) y las correcciones de la convergencia (T032 a T037, verificadas en T038).
