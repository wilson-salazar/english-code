# Especificación de la funcionalidad: Talk with AI — conversación guiada en inglés

**Rama de la funcionalidad**: `002-talk-with-ai`

**Creado**: 2026-11-01

**Estado**: Retroactiva — describe el comportamiento actual del módulo ("tal como está construido") y registra sus dos cambios más recientes. A partir de aquí es la base para los cambios futuros.

**Entrada**: Descripción del usuario: "Talk with AI — especificación retroactiva de un módulo que ya existe y va a recibir muchos cambios: conversación guiada en inglés con una IA para que el estudiante practique hablar y escribir, con dos modos (vocabulario propio y conversación abierta), y los cambios recientes de desplazamiento automático y cuadro de respuesta un 30% más alto."

## Clarifications (aclaraciones)

### Session 2026-11-01

- Q: En el modo "Open conversation", ¿debe la IA terminar siempre cada turno con una pregunta, solo cuando sea útil, o nunca? → A: Solo cuando sea útil. La pregunta final es obligatoria en el modo "Talk with AI" y opcional en el modo abierto, donde el estudiante lidera el tema.
- Q: Si el estudiante deniega el permiso del micrófono o su equipo no tiene micrófono, ¿qué debe mostrar el módulo? → A: Dos mensajes claros, uno para "permiso denegado" y otro para "micrófono no encontrado", y el estudiante puede seguir escribiendo su respuesta, igual que en Shadowing.
- Q: En una conversación abierta larga, ¿hasta dónde debe "acordarse" la IA de lo que se dijo antes? → A: Se mantiene el límite actual de los últimos 20 mensajes y queda documentado como límite conocido; no se amplía ni se resume lo antiguo.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Practicar con mi vocabulario en una conversación guiada (Prioridad: P1)

Como estudiante, quiero que la IA abra una conversación sobre un tema nuevo y use de forma natural las palabras que guardé, para practicarlas en contexto, responder varias veces y recibir al final una retroalimentación sobre cómo lo hice.

**Por qué esta prioridad**: Es el flujo principal del módulo y la razón de ser del vocabulario personal; sin él no hay producto. Con esta sola historia el módulo ya es útil.

**Prueba independiente**: Con al menos una palabra guardada, abrir el modo "Talk with AI", ver que la IA propone un tema y abre la conversación, responder hasta llegar a la retroalimentación final y comprobar que las palabras aparecieron en la conversación.

**Escenarios de aceptación**:

1. **Dado** que el estudiante entra al modo "Talk with AI", **Cuando** la pantalla carga, **Entonces** la IA elige un tema que nunca ha usado con ese estudiante, muestra su título y categoría, y abre la conversación con un primer turno.
2. **Dado** que el estudiante tiene palabras guardadas que aún no marcó como aprendidas, **Cuando** la IA conversa, **Entonces** usa de forma natural esas palabras (hasta 10), cada una al menos una vez en sus primeros cuatro turnos, y las resalta en sus mensajes.
3. **Dado** que el estudiante respondió, **Cuando** envía su respuesta, **Entonces** la IA contesta en inglés y la conversación continúa mientras el contador "Response N of 5" avanza.
4. **Dado** que el estudiante envió su quinta respuesta, **Cuando** se envía, **Entonces** la IA entrega automáticamente la retroalimentación (resumen, lo que hizo bien, qué mejorar y un siguiente paso) y un mensaje de cierre.
5. **Dado** que el estudiante ya envió al menos dos respuestas, **Cuando** elige terminar antes, **Entonces** recibe la misma retroalimentación sin esperar a la quinta.
6. **Dado** que la conversación terminó, **Cuando** el estudiante lo pide, **Entonces** puede iniciar un tema nuevo.
7. **Dado** que una palabra guardada ya no necesita práctica, **Cuando** el estudiante la marca como aprendida, **Entonces** sale de la lista de la conversación y no se usa en temas futuros.

---

### Historia de usuario 2 - Conversar libremente sobre un tema propio (Prioridad: P2)

Como estudiante, quiero abrir una conversación con cualquier pregunta o tema que se me ocurra, sin que la IA imponga vocabulario, para practicar inglés sobre lo que me interesa en el momento.

**Por qué esta prioridad**: Amplía el valor del módulo a cualquier tema, pero el módulo ya funciona sin ella gracias a la historia 1.

**Prueba independiente**: Abrir "Open conversation", escribir o decir una pregunta, recibir la respuesta de la IA, continuar el diálogo y terminar pidiendo retroalimentación.

**Escenarios de aceptación**:

1. **Dado** que el estudiante entra al modo "Open conversation", **Cuando** la pantalla carga, **Entonces** se le invita a empezar con cualquier pregunta o tema y la IA no abre la conversación por su cuenta.
2. **Dado** que el estudiante envió su primer mensaje, **Cuando** la IA responde, **Entonces** sigue el tema elegido por el estudiante y no usa ni menciona su vocabulario guardado.
3. **Dado** que el estudiante envió al menos una respuesta, **Cuando** elige terminar, **Entonces** recibe la retroalimentación; no hay un máximo fijo de respuestas.
4. **Dado** que la conversación terminó, **Cuando** el estudiante lo pide, **Entonces** puede iniciar una conversación nueva.

---

### Historia de usuario 3 - Responder hablando o escribiendo (Prioridad: P2)

Como estudiante, quiero contestar con mi voz o escribiendo, revisar y corregir lo que se capturó antes de enviarlo, y disponer de un cuadro cómodo para respuestas largas.

**Por qué esta prioridad**: Es la forma de interactuar con las dos historias anteriores; mejora la experiencia, pero se puede conversar solo escribiendo.

**Prueba independiente**: Responder una vez hablando y otra escribiendo, corregir el texto antes de enviar y comprobar que se envía lo corregido.

**Escenarios de aceptación**:

1. **Dado** que el estudiante habla, **Cuando** dice su respuesta, **Entonces** el texto aparece en el cuadro de respuesta mientras habla.
2. **Dado** que hay texto en el cuadro, **Cuando** lo edita, lo borra o vuelve a grabar, **Entonces** el cuadro refleja el cambio y solo se envía lo que quedó al pulsar enviar.
3. **Dado** que el navegador no admite reconocimiento de voz, **Cuando** el estudiante intenta grabar, **Entonces** se le avisa que la voz no está disponible y puede escribir su respuesta.
4. **Dado** que el estudiante quiere escribir una respuesta larga, **Cuando** usa el cuadro de respuesta, **Entonces** ve 3 líneas de texto a la vez (un 30% más de altura que antes, que eran 2) sin tener que desplazarse dentro del cuadro para las primeras líneas.
5. **Dado** que el estudiante intenta grabar su voz, **Cuando** el permiso del micrófono está denegado o el equipo no tiene micrófono, **Entonces** ve un mensaje claro y distinto para cada caso (permitir el micrófono, o conectar uno) y puede seguir escribiendo su respuesta.

---

### Historia de usuario 4 - Escuchar a la IA y seguir la conversación sin perder el hilo (Prioridad: P3)

Como estudiante, quiero oír cada mensaje de la IA mientras lo leo, poder repetirlo o saltarlo, y que la pantalla me muestre siempre lo último de la conversación sin tener que desplazarme a mano.

**Por qué esta prioridad**: Mejora la comprensión auditiva y la comodidad, pero el diálogo funciona leyendo el texto.

**Prueba independiente**: Recibir un mensaje largo de la IA y comprobar que la pantalla baja sola al ritmo en que el texto aparece; subir a releer y comprobar que la pantalla deja de seguir el final.

**Escenarios de aceptación**:

1. **Dado** que la IA responde, **Cuando** el mensaje aparece, **Entonces** el texto se va escribiendo mientras suena en voz alta, y el estudiante puede saltar el audio.
2. **Dado** que existe un mensaje de la IA, **Cuando** el estudiante lo pide, **Entonces** puede volver a escucharlo; también puede escuchar el título del tema y cada palabra guardada.
3. **Dado** que el contenido de la conversación crece (mensaje nuevo, texto de la IA escribiéndose mientras suena, indicador de que la IA está pensando o un error), **Cuando** el estudiante está leyendo el final de la conversación, **Entonces** la pantalla baja sola para mantener visible lo último, sin quedar tapado por la barra de respuesta.
4. **Dado** que el estudiante subió a releer un mensaje anterior, **Cuando** llega contenido nuevo, **Entonces** la pantalla no lo arrastra de vuelta al final.
5. **Dado** que el estudiante envía un mensaje, **Cuando** se envía, **Entonces** la pantalla vuelve a seguir el final de la conversación.
6. **Dado** que aparece la tarjeta de retroalimentación final, **Cuando** se muestra, **Entonces** la pantalla se centra en esa tarjeta, y el seguimiento automático del final no interfiere.

---

### Casos límite

- ¿Qué pasa si el estudiante no tiene palabras guardadas en el modo "Talk with AI"? La conversación sigue sobre un tema útil y se le invita a agregar palabras más adelante.
- ¿Qué pasa si el navegador no soporta reconocimiento de voz? Se le avisa y puede escribir.
- ¿Qué pasa si el estudiante deniega el permiso del micrófono o no hay micrófono? Se le muestra un mensaje distinto para cada caso y puede seguir escribiendo (FR-020).
- ¿Qué pasa si la IA falla al responder? La respuesta del estudiante queda guardada y puede reintentar la respuesta de la IA sin volver a escribirla.
- ¿Qué pasa si falla guardar la respuesta del estudiante o generar la retroalimentación? Se muestra un mensaje de error claro y puede intentarlo de nuevo.
- ¿Qué pasa si una conversación se alarga mucho, sobre todo en el modo abierto, que no tiene tope de respuestas? La IA solo recuerda los últimos 20 mensajes (unas 10 idas y vueltas); lo anterior ya no lo ve y puede repetir una pregunta o perder un detalle.
- ¿Qué pasa si el estudiante escribe una respuesta muy larga? Se admiten respuestas de hasta 5000 caracteres; más allá de eso no se puede guardar.
- ¿Qué pasa si el audio no está disponible o falla? El texto del mensaje se escribe igualmente en pantalla, sin sonido, y la conversación continúa.
- ¿Qué pasa si el estudiante recarga la página o vuelve más tarde? Cada visita empieza un tema diferente; lo conversado antes queda guardado en su historial pero no se retoma.
- ¿Qué pasa si el estudiante pide un tema nuevo mientras la IA habla? El audio se detiene y se inicia el tema nuevo. Mientras la IA está pensando o preparando el tema, esa opción no está disponible.

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: En el modo "Talk with AI", el sistema DEBE elegir por su cuenta un tema que nunca haya usado con ese estudiante (según su historial), mostrar su título y categoría, y abrir la conversación con un primer turno de la IA.
- **FR-002**: En el modo "Talk with AI", el sistema DEBE incluir hasta 10 de las palabras o frases guardadas del estudiante que aún no están marcadas como aprendidas, usando cada una al menos una vez en los primeros cuatro turnos de la IA, de forma natural y sin presentarlas como lista forzada.
- **FR-003**: Si el estudiante no tiene palabras guardadas, el sistema DEBE conversar igualmente sobre un tema útil e invitarlo a agregar palabras para futuras conversaciones.
- **FR-004**: El sistema DEBE resaltar las palabras guardadas en los mensajes de la IA y mostrar en un panel las palabras de la conversación.
- **FR-005**: El estudiante DEBE poder marcar una palabra como aprendida; al hacerlo sale de la lista de la conversación y deja de usarse en temas futuros.
- **FR-006**: En el modo "Talk with AI", la conversación DEBE admitir hasta 5 respuestas del estudiante, mostrando el avance ("Response N of 5"); al enviar la quinta, el sistema DEBE entregar la retroalimentación automáticamente.
- **FR-007**: El estudiante DEBE poder terminar la conversación antes de tiempo y pedir la retroalimentación: desde su segunda respuesta en el modo "Talk with AI" y desde su primera respuesta en el modo "Open conversation".
- **FR-008**: En el modo "Open conversation", el estudiante DEBE iniciar la conversación con cualquier pregunta o tema; el sistema NO DEBE usar ni mencionar el vocabulario guardado y NO DEBE imponer un máximo fijo de respuestas.
- **FR-009**: La retroalimentación DEBE incluir un resumen, lo que el estudiante hizo bien, qué mejorar y un siguiente paso, acompañada de un mensaje de cierre de la IA que se guarda en la conversación.
- **FR-010**: Al terminar la conversación, el sistema DEBE ofrecer iniciar un tema nuevo (en el modo abierto, una conversación nueva); el estudiante también DEBE poder pedirlo en cualquier momento, salvo mientras la IA está pensando o preparando el tema.
- **FR-011**: La IA DEBE hablar solo en inglés, con una dificultad acorde al nivel CEFR del estudiante; cada turno DEBE ser conversacional, de unas 45 a 90 palabras; en el modo "Talk with AI" cada turno DEBE terminar con una pregunta directa, y en el modo "Open conversation" la pregunta es opcional y la IA solo pregunta cuando resulte útil para la conversación; DEBE dar contexto que haga comprensible el vocabulario desconocido sin traducir todo el mensaje.
- **FR-012**: El estudiante DEBE poder responder hablando o escribiendo, revisar y corregir el texto antes de enviarlo, borrarlo o volver a grabar; el sistema solo DEBE enviar lo que haya quedado en el cuadro.
- **FR-013**: Si el navegador no admite reconocimiento de voz, el sistema DEBE avisarlo y permitir al estudiante escribir su respuesta.
- **FR-014**: Los mensajes de la IA DEBEN aparecer como texto mientras suenan en voz alta; el estudiante DEBE poder saltar el audio, volver a escuchar cualquier mensaje de la IA y escuchar el título del tema y cada palabra guardada.
- **FR-015**: Si la IA falla al responder, el sistema DEBE conservar la respuesta del estudiante y ofrecer reintentar la respuesta de la IA sin que el estudiante tenga que volver a escribirla.
- **FR-016**: El sistema DEBE guardar cada conversación y sus mensajes por estudiante, protegidos de modo que solo su dueño pueda verlos, y el título del tema NO DEBE repetirse para el mismo estudiante.
- **FR-017**: Cuando el contenido de la conversación crece (mensaje nuevo, texto de la IA escribiéndose mientras suena, indicador de que la IA está pensando o un error), la pantalla DEBE bajar sola para mantener visible lo último, sin quedar tapado por la barra de respuesta, siempre que el estudiante esté leyendo el final de la conversación.
- **FR-018**: El desplazamiento automático NO DEBE sacar al estudiante de lo que está releyendo si él mismo subió; DEBE volver a seguir el final cuando el estudiante envía un mensaje o baja de nuevo hasta el final. La tarjeta de retroalimentación final DEBE conservar su propio desplazamiento (centrarse en pantalla).
- **FR-019**: El cuadro donde el estudiante escribe o ve su respuesta DEBE mostrar 3 líneas de texto a la vez, un 30% más de altura que la versión anterior (2 líneas), para facilitar respuestas largas.
- **FR-020**: Si el estudiante intenta grabar y el permiso del micrófono está denegado, el sistema DEBE mostrar un mensaje claro que le pida permitir el micrófono; si el equipo no tiene micrófono, DEBE mostrar un mensaje distinto que le pida conectar uno; en ambos casos el estudiante DEBE poder seguir escribiendo su respuesta. Mismo comportamiento que FR-013 del módulo Shadowing.

### Entidades clave

- **Conversación**: un diálogo del estudiante con la IA, con su tema (título y categoría), el modo en que se hizo, las palabras guardadas que se practicaron y la fecha; pertenece a un solo estudiante.
- **Mensaje**: cada intervención de la conversación, con su autor (estudiante o IA) y su contenido; incluye el mensaje de cierre de la IA tras la retroalimentación.
- **Palabra guardada**: una palabra o frase que el estudiante guardó para practicar, con su estado (pendiente o aprendida) y, si existe, su significado en español.
- **Retroalimentación**: el resumen, las fortalezas, las mejoras y el siguiente paso que se muestran al terminar la conversación.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Un estudiante nuevo puede abrir el módulo y enviar su primera respuesta en menos de 1 minuto, usando solo lo que ve en pantalla.
- **SC-002**: Un estudiante puede completar una conversación del modo "Talk with AI" (cinco respuestas más la retroalimentación) en menos de 15 minutos.
- **SC-003**: En el 100% de los mensajes de la IA, el estudiante puede escucharlos, repetirlos y saltar el audio.
- **SC-004**: En al menos 9 de cada 10 conversaciones del modo "Talk with AI" con palabras guardadas, cada palabra aparece al menos una vez en los primeros cuatro turnos de la IA.
- **SC-005**: Un mismo estudiante nunca recibe dos veces el mismo tema en el modo "Talk with AI" (0 repeticiones).
- **SC-006**: Cuando el estudiante está leyendo el final de la conversación, lo último que se muestra (mensaje, texto escribiéndose, indicador o error) queda visible sin que tenga que desplazarse, en el 100% de los casos.
- **SC-007**: El cuadro de respuesta muestra 3 líneas de texto a la vez, un 30% más que antes.
- **SC-008**: Ningún estudiante puede ver las conversaciones de otro (0 accesos cruzados).

## Supuestos

- El nivel CEFR del estudiante (el de su perfil) determina la dificultad de la conversación; si no tiene uno definido, se usa B1.
- El reconocimiento de voz depende de lo que ofrezca el navegador del estudiante (por ejemplo, Chrome); no es un análisis acústico de la pronunciación.
- En el modo "Open conversation", la conversación queda registrada al enviar el primer mensaje y lleva un título genérico con la fecha, porque el tema lo pone el estudiante.
- Cada visita inicia un tema diferente; una conversación interrumpida no se retoma, aunque queda guardada en el historial.
- Las respuestas del estudiante admiten hasta 5000 caracteres.
- **Límite conocido**: la IA solo recuerda los últimos 20 mensajes de la conversación. Es una decisión aceptada, no una brecha; si el uso real muestra que estorba, se reabre con `/speckit-clarify`.
- La retroalimentación se muestra al terminar; lo que queda guardado de ella en el historial es el mensaje de cierre de la IA.
- **Pendiente de verificar**: FR-020 (mensajes para permiso de micrófono denegado y micrófono no encontrado) ya está implementado, pero falta comprobarlo en la aplicación corriendo (T022 de `tasks.md`).
- El módulo requiere conexión a internet para la IA, la voz y el reconocimiento de voz del navegador, igual que el resto de módulos de habla.
- Las palabras guardadas se administran desde el widget de vocabulario personal de la aplicación; este módulo solo las usa y permite marcarlas como aprendidas.
