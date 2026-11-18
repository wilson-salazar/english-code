# Especificación de la funcionalidad: Módulo Interview

**Rama de la funcionalidad**: `007-interview-practice`

**Creado**: 2026-11-17

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Creación de un nuevo módulo llamado Interview. La idea es que el usuario tenga la opción de cargar su CV una vez o actualizarla, y a partir de allí la IA pueda crear una entrevista como si fuera una reclutadora. El diálogo de la IA será en inglés, pero también va a dejar un texto, como ya lo tenemos en Talk with AI. El usuario responde y lo que diga también queda en un cuadro de texto donde puede ser corregido. La temática de las preguntas siempre actúa como una reclutadora; las preguntas serán conceptuales, circunstanciales y algunas que se te puedan ocurrir, sabiendo qué es lo que más preguntan en este tipo de entrevista para QA. Cada vez que el usuario entre al módulo de entrevista, el tema y las preguntas varían, así como se hace hoy con los temas de Talk with AI, para evitar que el usuario memorice las preguntas." Y después: "La carga de la CV es importante porque es la base que usa la IA para generar la entrevista."

## Aclaraciones

### Sesión 2026-11-17

- P: ¿Qué formatos de CV se aceptan? → R: Solo PDF.
- P: ¿Cuántas preguntas tiene cada entrevista? → R: 6.
- P: ¿Qué incluye la retroalimentación final? → R: Fortalezas, qué mejorar y un siguiente paso, como Talk with AI, más una versión mejorada de las 2 o 3 respuestas más débiles.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Cargar mi CV (Prioridad: P1)

Como estudiante que busca trabajo en tecnología, quiero subir mi CV una vez y poder reemplazarlo cuando lo actualice, para que las entrevistas se basen en mi experiencia real.

**Por qué esta prioridad**: el CV es la base de la entrevista. Sin él no se puede empezar.

**Prueba independiente**: subir un CV, revisar el texto que se leyó, corregir algo, guardarlo, salir y volver, y ver que sigue ahí. Luego reemplazarlo por otro.

**Escenarios de aceptación**:

1. **Dado** que el estudiante no tiene CV, **Cuando** entra a Interview, **Entonces** se le pide subirlo antes de cualquier otra cosa, y no puede empezar una entrevista.
2. **Dado** que sube un archivo válido, **Cuando** termina de leerse, **Entonces** ve el texto que se extrajo, puede corregirlo, y solo se guarda al confirmar.
3. **Dado** que ya tiene un CV guardado, **Cuando** entra a Interview, **Entonces** ve que tiene un CV, con la fecha en que lo actualizó, y puede verlo, editarlo o reemplazarlo por otro archivo.
4. **Dado** un archivo que no se puede leer, o que no contiene texto, **Cuando** lo sube, **Entonces** recibe un mensaje claro, y no se guarda un CV vacío.

---

### Historia de usuario 2 - Practicar una entrevista con una reclutadora (Prioridad: P1)

Como estudiante, quiero que una reclutadora con IA me entreviste en inglés a partir de mi CV, hablando y dejando su texto en pantalla, y responderle por voz con la posibilidad de corregir lo que dije antes de enviarlo, para practicar entrevistas reales de QA.

**Por qué esta prioridad**: es el valor principal del módulo.

**Prueba independiente**: con un CV guardado, empezar una entrevista, escuchar la primera pregunta, responder por voz, corregir el texto, enviarlo y recibir la siguiente pregunta.

**Escenarios de aceptación**:

1. **Dado** un CV guardado, **Cuando** el estudiante pulsa el botón para empezar, **Entonces** la reclutadora se presenta y hace la primera pregunta en inglés, con su voz y su texto en pantalla, como en Talk with AI.
2. **Dado** una pregunta, **Cuando** el estudiante responde por voz, **Entonces** su respuesta aparece en un cuadro de texto que puede corregir antes de enviarla. También puede escribirla directamente.
3. **Dado** que envía su respuesta, **Cuando** la reclutadora contesta, **Entonces** reacciona con naturalidad a lo que dijo y hace la siguiente pregunta, como en una entrevista real.
4. **Dado** que entra a Interview, **Cuando** se abre la pantalla, **Entonces** no empieza ninguna entrevista ni se gastan créditos hasta pulsar el botón (como Talk with AI desde 006).

---

### Historia de usuario 3 - Preguntas variadas y basadas en mi CV (Prioridad: P2)

Como estudiante, quiero que cada entrevista se centre en una parte distinta de mi CV y combine distintos tipos de preguntas, para no memorizar las respuestas y practicar lo que de verdad preguntan en entrevistas de QA.

**Por qué esta prioridad**: sin variedad, la práctica pierde valor al repetirse; pero una sola entrevista ya es útil sin esta historia.

**Prueba independiente**: hacer dos entrevistas seguidas y comparar el enfoque y las preguntas.

**Escenarios de aceptación**:

1. **Dado** un CV con varios proyectos, roles y herramientas, **Cuando** el estudiante hace varias entrevistas, **Entonces** cada una se centra en un enfoque distinto del CV, y no repite el de las entrevistas recientes.
2. **Dado** el CV, **Cuando** la reclutadora hace preguntas técnicas, **Entonces** se refieren a las herramientas, prácticas y proyectos que aparecen en el CV, no a otras que el estudiante no menciona.
3. **Dado** una entrevista, **Cuando** termina, **Entonces** incluyó preguntas de al menos tres tipos distintos de la lista de tipos de pregunta.

---

### Historia de usuario 4 - Saber cómo me fue (Prioridad: P2)

Como estudiante, quiero recibir al final una retroalimentación de la entrevista, para saber qué mejorar en mis respuestas y en mi inglés.

**Por qué esta prioridad**: convierte la práctica en aprendizaje, pero la entrevista ya es útil sin ella.

**Prueba independiente**: terminar una entrevista y revisar la retroalimentación.

**Escenarios de aceptación**:

1. **Dado** que responde la última pregunta, **Cuando** la entrevista termina, **Entonces** recibe una retroalimentación con sus fortalezas, qué mejorar y un siguiente paso, más una versión mejorada de sus 2 o 3 respuestas más débiles, cada una junto a lo que respondió.
2. **Dado** una entrevista a medias, **Cuando** el estudiante decide terminarla antes, **Entonces** puede pedir la retroalimentación con lo respondido hasta ese momento.

---

### Casos límite

- **Sin CV**: no se puede empezar una entrevista; la pantalla lleva a subirlo.
- **Archivo no válido**: un archivo que no es PDF, un archivo demasiado grande, uno protegido con contraseña, o uno que solo tiene imágenes sin texto, se rechazan con un mensaje claro.
- **CV muy largo**: se acepta hasta un máximo de texto; por encima, se avisa para que el estudiante lo recorte.
- **Datos de contacto en el CV**: el estudiante puede borrarlos al revisar el texto antes de guardarlo, porque el CV se envía al proveedor de IA en cada entrevista.
- **CV con poca información**: la reclutadora hace preguntas generales de QA, y lo menciona al empezar.
- **CV en español**: se acepta; la entrevista es siempre en inglés.
- **Respuesta vacía**: no se puede enviar.
- **Respuesta en español**: la reclutadora pide amablemente responder en inglés, sin contarla como respuesta.
- **Reemplazar el CV con una entrevista a medias**: la entrevista en curso sigue con el CV con el que empezó.
- **Salir o recargar a media entrevista**: aplica la confirmación de 005; al volver, aparece el botón para empezar, y la entrevista anterior queda en el historial, como en Talk with AI (006).
- **Falla el servicio de IA o de voz**: mensaje claro, se conserva lo escrito, y se puede reintentar, como en Talk with AI.
- **Sesión vencida**: el aviso de sesión de 003, con lo escrito intacto.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Módulo**

- **FR-001**: El menú DEBE incluir un módulo Interview, con su propia sección y su pantalla de entrevista, siguiendo la navegación de 005.
- **FR-002**: Interview DEBE exigir sesión iniciada, como el resto de la aplicación.

**CV**

- **FR-003**: El estudiante DEBE poder subir su CV desde Interview, solo en formato PDF.
- **FR-004**: Tras subirlo, la aplicación DEBE mostrar el texto extraído para que el estudiante lo revise y corrija, y guardarlo solo cuando lo confirme.
- **FR-005**: Cada estudiante DEBE tener como máximo un CV guardado. Subir otro lo reemplaza tras confirmar.
- **FR-006**: El estudiante DEBE poder ver, editar y reemplazar su CV guardado, con la fecha de su última actualización.
- **FR-007**: Se guarda el texto del CV, no el archivo original. Solo su dueño puede verlo.
- **FR-008**: La aplicación DEBE rechazar archivos de más de 5 MB y textos de CV de más de 20 000 caracteres, con un mensaje claro.

**Entrevista**

- **FR-009**: Sin CV guardado, NO DEBE poder empezar una entrevista.
- **FR-010**: Entrar a la pantalla de entrevista NO DEBE llamar a la IA ni generar audio; la entrevista empieza al pulsar un botón.
- **FR-011**: La IA DEBE actuar siempre como una reclutadora de una empresa de tecnología, hablando en inglés, con su voz y su texto en pantalla, como en Talk with AI.
- **FR-012**: El estudiante DEBE poder responder por voz o por escrito; su respuesta queda en un cuadro de texto editable antes de enviarla.
- **FR-013**: Cada entrevista DEBE tener 6 preguntas, mostrando el avance ("Question N of 6").
- **FR-014**: Las preguntas DEBEN basarse en el CV y combinar tipos de esta lista: apertura (presentarse, motivación), experiencia del CV (un proyecto o rol concreto), conceptos de QA (por ejemplo, severidad frente a prioridad, tipos de prueba, pirámide de pruebas), automatización (herramientas y prácticas del CV, pruebas inestables, pruebas de API, integración continua), situaciones (un error que llegó a producción, un desacuerdo con un desarrollador, poco tiempo antes de una entrega) y casos prácticos ("How would you test...?"). Cada entrevista DEBE usar al menos tres tipos.
- **FR-015**: Cada entrevista DEBE centrarse en un enfoque distinto del CV y evitar el enfoque y las preguntas de las entrevistas recientes, como Talk with AI evita sus temas recientes.
- **FR-016**: La reclutadora DEBE reaccionar con naturalidad a cada respuesta antes de la siguiente pregunta, sin corregir el inglés durante la entrevista.
- **FR-017**: El lenguaje de la reclutadora DEBE adaptarse al nivel del estudiante (A2 a C1), sin dejar de sonar como una entrevista profesional.
- **FR-018**: El estudiante DEBE poder terminar la entrevista antes de la última pregunta y pedir la retroalimentación.
- **FR-019**: Al terminar, la aplicación DEBE mostrar una retroalimentación con fortalezas, qué mejorar y un siguiente paso, más una versión mejorada de las 2 o 3 respuestas más débiles, cada una junto a lo que respondió el estudiante. Si terminó antes con menos de 3 respuestas, se mejoran las que haya.
- **FR-020**: La entrevista, sus preguntas, respuestas y retroalimentación DEBEN guardarse en el historial del estudiante, para variar las siguientes.

**Protección y errores**

- **FR-021**: Toda acción que gaste créditos DEBE exigir una sesión válida y rechazar entradas excesivas antes de llamar al proveedor, como establece 003.
- **FR-022**: Una entrevista a medias cuenta como trabajo sin guardar (005).
- **FR-023**: El audio de la reclutadora DEBE reutilizarse al repetirlo, como establece 006.
- **FR-024**: Ante un fallo, la aplicación DEBE mostrar un mensaje claro, sin detalles internos de los proveedores, y conservar lo que el estudiante escribió.

### Entidades clave

- **CV**: el texto del CV de un estudiante, con su fecha de última actualización. Uno por estudiante.
- **Entrevista**: una práctica con fecha, el enfoque elegido, el número de preguntas previstas, su estado (en curso o terminada) y su retroalimentación.
- **Turno de entrevista**: una pregunta de la reclutadora o una respuesta del estudiante, en orden.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Con un CV en PDF de 1 a 3 páginas, el estudiante ve el texto extraído en menos de 10 segundos, y conserva todas sus secciones.
- **SC-002**: Entrar a Interview, recargar y salir sin pulsar el botón no genera ninguna llamada a la IA ni ningún audio.
- **SC-003**: Cada pregunta de la reclutadora aparece en menos de 5 segundos tras enviar una respuesta.
- **SC-004**: En 5 entrevistas seguidas con el mismo CV, no se repite el enfoque de ninguna de las 3 anteriores.
- **SC-005**: En cada entrevista, todas las preguntas técnicas mencionan herramientas, prácticas o proyectos del CV, o conceptos generales de QA; ninguna da por hecho experiencia que el CV no menciona.
- **SC-006**: Ningún fallo del servicio ni vencimiento de sesión hace perder la respuesta escrita.
- **SC-007**: Solo el dueño del CV puede leerlo: otra sesión no tiene acceso a él.

## Supuestos

- **Único usuario**: la aplicación es personal, con el dueño como único usuario.
- **Solo web**: la funcionalidad se diseña para el navegador de escritorio.
- **CV obligatorio** (decisión del dueño): es la base de la entrevista.
- **Solo PDF, 6 preguntas y retroalimentación con respuestas mejoradas** (decisiones del dueño del 2026-11-17).
- **Texto, no archivo**: guardar solo el texto revisado evita conservar el archivo original con datos que el estudiante no quiera compartir, y permite corregir una lectura mala.
- **El CV sale al proveedor de IA**: se envía en cada entrevista, como hoy las respuestas en las evaluaciones. El estudiante puede quitar sus datos de contacto al revisarlo.
- **Reclutadora con voz femenina**: usa la voz de Jessa, ya disponible en la aplicación, porque el dueño pidió "una reclutadora".
- **Sin corrección durante la entrevista**: como en una entrevista real, las correcciones de inglés van en la retroalimentación final.
- **Botón para empezar**: sigue el criterio de 006 para no gastar créditos al entrar.
- **Sin retomar entrevistas**: al recargar, la entrevista a medias queda en el historial, como en Talk with AI (006).
- **Dependencias**: 003 (sesión y límites), 005 (menú y confirmación al salir) y 006 (audio reutilizado y botón para empezar).

## Fuera del alcance

- Adaptar la entrevista a una oferta de trabajo pegada por el estudiante (posible mejora futura).
- Entrevistas técnicas en vivo con código, o pruebas de programación.
- Entrevistas para roles distintos de QA y desarrollo.
- Guardar el archivo original del CV.
- Aceptar CV en Word u otros formatos distintos de PDF.
- Puntajes por respuesta en la retroalimentación.
- Retomar una entrevista a medias.
- Uso con pantallas táctiles o en una versión móvil.
- Cualquier reinicio o borrado de la base de datos.
