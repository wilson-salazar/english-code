# Especificación de la funcionalidad: Ahorro de créditos de IA y audio

**Rama de la funcionalidad**: `006-credit-savings`

**Creado**: 2026-11-13

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Algo que podría ayudar a frenar esas peticiones es colocar aquí un botón cuando el usuario quiera empezar con un nuevo tema, porque cuando entras al módulo enseguida empieza el nuevo tema, y esto pasa cuando recargas la página." Ampliado por el dueño el 2026-11-13 para incluir la reutilización del audio ya generado, tras medir que Shadowing pidió 11 veces el audio de "mourn" y 7 el de "their" en un solo ejercicio.

## Aclaraciones

### Sesión 2026-11-17

- P: Al recargar o volver a Talk with AI con una conversación sin terminar, ¿se retoma o se muestra el botón? → R: Se muestra de nuevo el botón para empezar un tema; la conversación anterior queda guardada en el historial.
- P: ¿Cuánto tiempo se reutiliza un audio ya generado? → R: También en días posteriores: los audios se guardan en el equipo del dueño, con un límite de espacio que descarta primero los usados hace más tiempo.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Entrar a Talk with AI sin gastar créditos (Prioridad: P1)

Como estudiante, quiero que Talk with AI espere a que yo pida un tema nuevo, para que entrar, recargar o pasar por el módulo no gaste créditos de IA ni de audio.

**Por qué esta prioridad**: hoy cada entrada o recarga crea un tema, con una llamada a la IA y un audio, aunque el estudiante solo esté de paso. Con el menú siempre visible (005), pasar por Talk es más frecuente. En las pruebas de 005 se crearon 6 temas que nunca se usaron.

**Prueba independiente**: entrar a Talk con tus palabras, recargar la página y salir, y comprobar que no se generó ningún tema ni audio. Luego pulsar el botón y comprobar que la conversación empieza como hoy.

**Escenarios de aceptación**:

1. **Dado** que el estudiante entra a Talk with AI con sus palabras guardadas, **Cuando** se abre la pantalla, **Entonces** ve las palabras que se usarán y un botón para empezar un tema nuevo, sin que se genere ningún tema ni audio.
2. **Dado** esa pantalla, **Cuando** pulsa el botón, **Entonces** se elige el tema y la IA abre la conversación con su primer mensaje hablado, como hoy.
3. **Dado** esa pantalla, **Cuando** recarga la página o sale sin pulsar el botón, **Entonces** no se gasta ningún crédito.
4. **Dado** que pulsó el botón, **Cuando** el tema se está preparando, **Entonces** el botón queda deshabilitado, y pulsarlo de nuevo no crea un segundo tema.

---

### Historia de usuario 2 - Repetir un audio sin volver a pedirlo (Prioridad: P1)

Como estudiante, quiero que un audio que ya escuché se reutilice cuando lo repito, para practicar todas las veces que necesite sin gastar créditos de audio en cada repetición.

**Por qué esta prioridad**: repetir es la base de la práctica de pronunciación, y hoy cada repetición pide el audio de nuevo. En un ejercicio de Shadowing, la palabra "mourn" se pidió 11 veces y "their" 7.

**Prueba independiente**: en Shadowing, escuchar una palabra, fallar varias veces, pulsar "Listen again" y la opción más lenta, y comprobar que el audio de esa palabra se pidió una sola vez.

**Escenarios de aceptación**:

1. **Dado** una palabra de Shadowing ya escuchada, **Cuando** se repite sola tras un intento fallido, o el estudiante pulsa "Listen again", **Entonces** suena el mismo audio sin volver a pedirlo.
2. **Dado** una palabra ya escuchada, **Cuando** el estudiante pide escucharla más lenta, **Entonces** suena el mismo audio a menor velocidad, sin volver a pedirlo.
3. **Dado** un diálogo, una pregunta, una palabra resaltada, una regla gramatical, un mensaje de Talk o una palabra guardada ya escuchados, **Cuando** el estudiante vuelve a reproducirlos, **Entonces** suenan sin volver a pedir el audio.
4. **Dado** un audio que nunca se ha generado, **Cuando** el estudiante lo reproduce por primera vez, **Entonces** se pide al proveedor y suena como hoy.

---

### Casos límite

- **Mismo texto con otra voz**: es un audio distinto. Un diálogo dicho por Adam no reutiliza el audio de Jessa.
- **Mismo texto con diferencias mínimas** (espacios de más al inicio, al final o entre palabras): se considera el mismo texto. Una diferencia de mayúsculas o de puntuación cuenta como texto distinto, porque puede cambiar la entonación.
- **El audio guardado no se puede reproducir**: se pide de nuevo al proveedor, sin que el estudiante note un error.
- **El proveedor de audio falla**: se comporta como hoy, y no se guarda nada para reutilizar.
- **Recargar con una conversación de Talk a medias**: aparece de nuevo el botón para empezar un tema, y la conversación queda en el historial (FR-005).
- **Recargar mientras se prepara el tema de Talk**: el tema que estaba en preparación se pierde, como hoy, y al volver aparece de nuevo el botón.
- **"New topic" con una conversación en curso**: sigue funcionando como hoy, porque el estudiante lo pide de forma explícita.
- **El espacio para guardar audio se llena**: se descartan primero los audios usados hace más tiempo, y la aplicación sigue funcionando.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Talk with AI**

- **FR-001**: En el modo "Talk with AI", entrar a la pantalla o recargarla NO DEBE elegir un tema, llamar a la IA ni generar audio.
- **FR-002**: Al entrar, la pantalla DEBE mostrar las palabras guardadas que se usarán, hasta 10, y un botón "Start a new topic".
- **FR-003**: Al pulsar el botón, DEBE empezar la conversación como hoy: elegir un tema nuevo, mostrar su título y categoría, y abrirla con el primer mensaje hablado de la IA (spec 002, FR-001 a FR-004).
- **FR-004**: Mientras se prepara el tema, el botón DEBE quedar deshabilitado, y cada pulsación DEBE crear como máximo un tema.
- **FR-005**: Al volver a Talk with AI o recargar con una conversación sin terminar, la pantalla DEBE mostrar de nuevo el botón para empezar un tema. La conversación anterior queda guardada en el historial, y no se retoma. La confirmación al salir de 005 avisa antes de recargar con una conversación a medias.
- **FR-006**: El modo "Open conversation" NO DEBE cambiar: ya espera a que el estudiante escriba o hable primero.
- **FR-007**: El botón "New topic" del encabezado DEBE seguir funcionando como hoy.

**Audio**

- **FR-008**: Un audio ya generado para el mismo texto y la misma voz DEBE reutilizarse en lugar de pedirlo de nuevo al proveedor, también al recargar la página y en días posteriores. Los audios se guardan en el equipo del dueño, no en la base de datos.
- **FR-009**: La reutilización DEBE aplicarse a todos los audios de la aplicación: palabras y oraciones de Shadowing, diálogos de Listening, preguntas de Comprehension, palabras de Immersion, reglas de Explanation, mensajes de Talk y pronunciación de las palabras guardadas.
- **FR-010**: Escuchar más lento DEBE usar el mismo audio a menor velocidad.
- **FR-011**: Si un audio guardado no se puede reproducir, DEBE pedirse de nuevo al proveedor sin mostrar un error.
- **FR-012**: El espacio usado para guardar audio DEBE tener un límite, y al alcanzarlo DEBEN descartarse primero los audios usados hace más tiempo.
- **FR-013**: Reutilizar un audio NO DEBE cambiar lo que se escucha: misma voz, mismo texto y misma velocidad normal.

**Sin cambios en lo demás**

- **FR-014**: Todo lo demás de Talk with AI, Shadowing y las lecciones DEBE seguir igual, incluida la confirmación al salir con trabajo sin guardar (005).
- **FR-015**: Esta funcionalidad NO DEBE cambiar los datos del estudiante ni su historial.

### Entidades clave

- **Audio guardado**: el sonido generado para un texto y una voz, con la fecha de su último uso. No pertenece a un estudiante, porque el mismo texto suena igual para cualquiera.
- **Pantalla de inicio de Talk**: lo que se ve antes de empezar un tema: las palabras que se usarán y el botón.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Entrar a Talk with AI con tus palabras, recargar y salir sin pulsar el botón genera 0 llamadas a la IA y 0 audios.
- **SC-002**: Cada pulsación de "Start a new topic" genera exactamente 1 tema y 1 audio para el mensaje inicial.
- **SC-003**: En Shadowing, una palabra escuchada 10 veces, entre la reproducción automática, los intentos fallidos, "Listen again" y la opción más lenta, se pide al proveedor 1 sola vez.
- **SC-004**: Reproducir por segunda vez el diálogo de Listening de una lección no genera ninguna petición de audio nueva.
- **SC-005**: Un audio reutilizado empieza a sonar en menos de medio segundo.
- **SC-006**: Un recorrido por Talk, Shadowing y una lección funciona igual que antes, salvo el botón de inicio de Talk.
- **SC-007**: Al abrir otro día una lección ya practicada, sus audios suenan sin ninguna petición nueva al proveedor.

## Supuestos

- **Único usuario**: la aplicación es personal, con el dueño como único usuario.
- **Solo web**: la funcionalidad se diseña para el navegador de escritorio.
- **Botón para empezar** (decisión del dueño): Talk with AI no empieza un tema por su cuenta.
- **Sin retomar conversaciones** (decisión del dueño): retomar una conversación a medias queda como posible mejora futura.
- **Audio guardado en el equipo** (decisión del dueño): se conserva entre días, con un límite de espacio.
- **Modo abierto**: no cambia, porque ya no gasta créditos al entrar.
- **El audio no depende del estudiante**: el mismo texto con la misma voz suena igual para cualquiera, así que reutilizarlo no mezcla datos privados.
- **Textos que se repiten**: los diálogos, preguntas, reglas y palabras de las lecciones son fijos, así que son los que más ganan con la reutilización. Los mensajes de Talk y las oraciones de Shadowing cambian cada vez y solo ganan al repetirlos dentro de la misma práctica.
- **Dependencia de 002 y 005**: cambia el inicio de Talk descrito en la spec 002 (FR-001), y respeta la confirmación al salir de 005.

## Fuera del alcance

- Reducir el gasto de las evaluaciones, la traducción de palabras o el Writing Assistant, que ya solo gastan al pedirlos el estudiante.
- Cambiar el proveedor de audio o de IA, o el modelo de IA.
- Mostrar al estudiante un contador de créditos o de gasto.
- Generar por adelantado el audio de lecciones que el estudiante aún no ha abierto.
- Retomar una conversación de Talk a medias.
- Uso con pantallas táctiles o en una versión móvil.
- Cualquier reinicio o borrado de la base de datos.
