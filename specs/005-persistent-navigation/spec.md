# Especificación de la funcionalidad: Menú de navegación siempre visible

**Rama de la funcionalidad**: `005-persistent-navigation`

**Creado**: 2026-11-13

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Quiero que el menú de la izquierda permanezca siempre, dado que actualmente cuando se ingresa a alguno de los módulos el menú desaparece y el usuario tiene que ir a la opción Dashboard para regresar. La idea es que el menú esté siempre al alcance de cualquier módulo, así si el usuario quiere ir de un módulo a otro no tiene que abrir una nueva pestaña. En ese caso la ruta de migas solo serviría para la navegación de la parte interna de los módulos." Decisión del dueño: si hay trabajo sin guardar, se pide confirmación antes de salir.

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Cambiar de módulo desde cualquier pantalla (Prioridad: P1)

Como estudiante, quiero tener el menú a la vista en todas las pantallas, también dentro de una lección, un capítulo, una conversación o una herramienta, para pasar de un módulo a otro con un clic, sin volver al dashboard ni abrir otra pestaña.

**Por qué esta prioridad**: es lo que pidió el dueño. Hoy, para cambiar de módulo, hay que salir con "← Dashboard" y buscar de nuevo la sección.

**Prueba independiente**: abrir una lección, confirmar que el menú sigue visible con Learning path resaltado, y pulsar Grammar para llegar a la lista de capítulos con un solo clic.

**Escenarios de aceptación**:

1. **Dado** que el estudiante está dentro de un módulo, **Cuando** mira la pantalla, **Entonces** ve el menú con las mismas entradas y en el mismo orden que en el dashboard.
2. **Dado** que está dentro de un módulo, **Cuando** mira el menú, **Entonces** aparece resaltada la sección a la que pertenece esa pantalla.
3. **Dado** que está dentro de un módulo sin trabajo pendiente, **Cuando** pulsa otra entrada del menú, **Entonces** llega a esa sección con un solo clic.
4. **Dado** que está en una sección del menú, **Cuando** recarga la página, **Entonces** sigue en esa misma sección, no en la primera.
5. **Dado** que no ha iniciado sesión, o está en la pantalla de inicio de sesión o de restablecer la contraseña, **Cuando** mira la pantalla, **Entonces** no ve el menú.

---

### Historia de usuario 2 - No perder trabajo al cambiar de módulo (Prioridad: P1)

Como estudiante, quiero que la aplicación me pregunte antes de salir si dejo algo sin guardar, como un texto sin enviar o una conversación a medias, para no perderlo por un clic accidental en el menú.

**Por qué esta prioridad**: con el menú siempre a la vista, salir de un módulo pasa a estar a un clic. Sin esta protección, la Historia 1 haría más fácil perder trabajo, así que las dos se entregan juntas.

**Prueba independiente**: escribir una respuesta en una lección sin enviarla, pulsar otra entrada del menú, confirmar que aparece la pregunta, elegir quedarse y comprobar que el texto sigue intacto.

**Escenarios de aceptación**:

1. **Dado** que hay trabajo sin guardar, **Cuando** el estudiante pulsa otra entrada del menú, la ruta de migas o cerrar sesión, **Entonces** se le pregunta en inglés si quiere salir y perder ese trabajo, antes de salir.
2. **Dado** esa pregunta, **Cuando** elige quedarse, **Entonces** todo sigue exactamente como estaba: el texto, la grabación, la conversación y la fase.
3. **Dado** esa pregunta, **Cuando** elige salir, **Entonces** llega al destino elegido, y el trabajo pendiente se descarta, como ocurre hoy al salir.
4. **Dado** que no hay trabajo sin guardar, **Cuando** pulsa otra entrada del menú, **Entonces** sale sin ninguna pregunta.
5. **Dado** que hay trabajo sin guardar, **Cuando** recarga o cierra la pestaña, **Entonces** el navegador muestra su aviso habitual antes de salir.

---

### Historia de usuario 3 - Moverse dentro de un módulo con la ruta de migas (Prioridad: P2)

Como estudiante, quiero que cada pantalla interna muestre una ruta de migas, como "Learning path › Leading an Incident Call", para saber dónde estoy y volver a la sección del módulo, mientras el menú se encarga de cambiar de módulo.

**Por qué esta prioridad**: ordena la navegación y quita el enlace "← Dashboard", que deja de hacer falta. Sin esta historia, el menú ya permite cambiar de módulo.

**Prueba independiente**: abrir un capítulo, confirmar que la ruta de migas muestra "Grammar" y el nombre del capítulo, pulsar "Grammar" y llegar a la lista de capítulos.

**Escenarios de aceptación**:

1. **Dado** que el estudiante está en la pantalla de un módulo, **Cuando** la mira, **Entonces** ve una ruta de migas con la sección y la pantalla actual, y no ve el enlace "← Dashboard".
2. **Dado** la ruta de migas, **Cuando** pulsa la sección, **Entonces** vuelve a esa sección del menú, con la misma confirmación de la Historia 2 si hay trabajo sin guardar.
3. **Dado** una lección o un capítulo después de la primera fase, **Cuando** pulsa "← Back", **Entonces** vuelve a la fase anterior, como hoy.
4. **Dado** que termina una lección o un capítulo, **Cuando** la aplicación lo devuelve a la lista, **Entonces** llega a su sección (Learning path o Grammar), no a la primera sección del menú.

---

### Casos límite

- **Una petición en curso con el trabajo del estudiante** (la evaluación de su respuesta, la réplica de la IA a su mensaje o el guardado de su resultado): cuenta como trabajo sin guardar, porque su resultado se perdería al salir. Generar un audio, el tema de Talk o la oración de Shadowing no cuenta, porque no se pierde nada del estudiante.
- **Talk recién abierto**: el tema y el primer mensaje de la IA se generan solos al entrar. La conversación cuenta como empezada desde la primera respuesta del estudiante.
- **Pulsar la entrada de la sección actual desde dentro de un módulo** (por ejemplo, Learning path dentro de una lección): es salir del módulo hacia su lista, con la misma confirmación si hay trabajo pendiente.
- **Pulsar la sección en la que ya se está, en la lista de la sección**: no pasa nada.
- **Grabación en curso al aparecer la pregunta**: si el estudiante elige quedarse, la grabación sigue intacta; si elige salir, se detiene y se descarta, y el micrófono se libera.
- **Avance entre fases de una lección o un capítulo**: hoy no se guarda en qué fase se quedó el estudiante. Salir de una lección sin respuestas pendientes no pide confirmación, y al volver empieza de nuevo, como hoy.
- **Cambiar de nivel desde un módulo**: el estudiante sigue en la pantalla actual; el nuevo nivel se aplica a las listas de lecciones y capítulos.
- **Sesión vencida dentro de un módulo**: aparece el aviso de sesión existente, y el menú sigue visible.
- **Botón Atrás del navegador**: funciona como hoy, sin la confirmación de la aplicación.
- **Ventana estrecha**: el menú sigue disponible, con la presentación horizontal que ya usa hoy el dashboard en anchos pequeños.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Menú común**

- **FR-001**: El menú DEBE mostrarse en todas las pantallas con sesión iniciada: las secciones del dashboard, las lecciones, los capítulos, Talk with AI en sus dos modos, Shadowing y Writing Assistant, y en las pantallas de módulos que se agreguen después.
- **FR-002**: El menú DEBE tener las mismas entradas y en el mismo orden que hoy: Learning path, Grammar, Talk with AI, Shadowing, Tools y Progress.
- **FR-003**: El menú DEBE resaltar la sección actual. En una lección se resalta Learning path; en un capítulo, Grammar; en Talk with AI, Talk with AI; en Shadowing, Shadowing; y en una herramienta, Tools.
- **FR-004**: Cada sección DEBE poder abrirse con un clic desde cualquier pantalla, y DEBE conservarse al recargar la página.
- **FR-005**: Las opciones de cuenta que hoy están en el encabezado del dashboard, cambiar de nivel y cerrar sesión, DEBEN estar disponibles en todas las pantallas que muestran el menú.
- **FR-006**: La pantalla de inicio de sesión y la de restablecer la contraseña NO DEBEN mostrar el menú. Sin sesión, se mantiene el envío actual a la pantalla de inicio de sesión.

**Navegación dentro de los módulos**

- **FR-007**: Cada pantalla de un módulo DEBE mostrar una ruta de migas con su sección y la pantalla actual. Pulsar la sección vuelve a ella.
- **FR-008**: El enlace "← Dashboard" DEBE desaparecer de las pantallas de los módulos. La navegación propia del módulo, como "← Back" entre fases, DEBE mantenerse.
- **FR-009**: La información propia de cada módulo, como el título, la fase actual, el contador de fases y la barra de avance de una lección, DEBE mantenerse.
- **FR-010**: Al terminar una lección o un capítulo, la aplicación DEBE llevar al estudiante a su sección, Learning path o Grammar, en vez de a la primera sección del menú.

**Trabajo sin guardar**

- **FR-011**: Antes de salir de una pantalla con trabajo sin guardar, por el menú, la ruta de migas o cerrar sesión, la aplicación DEBE pedir confirmación en inglés, con una opción para quedarse y otra para salir. Quedarse DEBE ser la opción predeterminada.
- **FR-012**: Se considera trabajo sin guardar:
  - un texto escrito en un cuadro de respuesta y no enviado, en una lección, un capítulo o Talk with AI;
  - una grabación en curso, o grabada y no enviada;
  - una petición en curso con el trabajo del estudiante, cuyo resultado aún no se ha guardado;
  - una conversación de Talk with AI con al menos una respuesta del estudiante, hasta que recibe su retroalimentación final;
  - un ejercicio de Shadowing empezado y no terminado;
  - cualquier texto en el Writing Assistant, porque nunca se guarda.
- **FR-013**: Sin trabajo sin guardar, la aplicación NO DEBE pedir confirmación.
- **FR-014**: Al elegir quedarse, todo DEBE seguir exactamente como estaba.
- **FR-015**: Al elegir salir, el trabajo pendiente DEBE descartarse como ocurre hoy, sin guardar datos a medias ni contar avance que no se completó.
- **FR-016**: Al recargar o cerrar la pestaña con trabajo sin guardar, DEBE mostrarse el aviso habitual del navegador.

**Sin cambios en lo demás**

- **FR-017**: Todo lo que hoy funciona en cada módulo DEBE seguir igual: progreso, fases, conversación, audio, grabación y aviso de sesión vencida. Solo se agregan la confirmación de FR-011 y la ruta de migas.
- **FR-018**: Esta funcionalidad NO DEBE cambiar la base de datos ni los datos guardados.

### Entidades clave

- **Sección**: una entrada del menú, con nombre, descripción y una dirección propia que se conserva al recargar. No requiere almacenamiento.
- **Pantalla de módulo**: una pantalla dentro de una sección, como una lección o una herramienta, con su ruta de migas.
- **Trabajo sin guardar**: el estado de una pantalla que se perdería al salir, según FR-012. Existe solo mientras la pantalla está abierta.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Desde cualquier pantalla de un módulo, el estudiante llega a cualquier otra sección con 1 clic, o con 2 si confirma que quiere salir.
- **SC-002**: En cada caso de trabajo sin guardar de FR-012, en cada módulo donde aplica, salir por el menú pide confirmación en el 100% de los intentos.
- **SC-003**: Sin trabajo sin guardar, salir de cualquier módulo no muestra ninguna pregunta en el 100% de los intentos.
- **SC-004**: Al elegir quedarse, el trabajo pendiente queda idéntico en el 100% de los intentos.
- **SC-005**: Recargar la página en cualquiera de las 6 secciones deja al estudiante en esa misma sección.
- **SC-006**: Un recorrido por todos los módulos se completa igual que antes de este cambio, sin pasos nuevos salvo la confirmación.
- **SC-007**: En una ventana de escritorio de 1280 píxeles de ancho, el menú y el contenido de cada módulo se ven completos, sin desplazamiento horizontal.
- **SC-008**: Los conteos por tabla de la base de datos no cambian por navegar entre módulos.

## Supuestos

- **Único usuario**: la aplicación es personal, con el dueño como único usuario.
- **Solo web**: la funcionalidad se diseña para el navegador de escritorio.
- **Confirmación al salir** (decisión del dueño): se pregunta solo si hay trabajo sin guardar.
- **Opciones de cuenta en todas las pantallas** (confirmado por el dueño): cambiar de nivel y cerrar sesión pasan a estar disponibles junto al menú, porque forman parte del marco que hoy solo tiene el dashboard (FR-005).
- **Avance entre fases** (confirmado por el dueño): no se guarda hoy y sigue sin guardarse. Salir de una lección sin respuestas pendientes no pide confirmación.
- **Botón Atrás del navegador**: no se intercepta, porque el navegador no permite hacerlo de forma fiable. Recargar y cerrar la pestaña sí muestran el aviso del navegador (FR-016).
- **Entradas del menú**: no cambian sus nombres, descripciones ni orden. El módulo Interview (006) se agregará después como una entrada más.
- **Sin base de datos**: no requiere tablas nuevas ni cambios de esquema, por lo que no toca los datos existentes.

## Fuera del alcance

- El módulo Interview, que será la funcionalidad 006.
- Rediseñar el aspecto del menú más allá de lo necesario para mostrarlo en todas las pantallas.
- Guardar en qué fase se quedó el estudiante dentro de una lección o un capítulo.
- Interceptar el botón Atrás del navegador.
- Uso con pantallas táctiles o en una versión móvil.
- Cualquier cambio, reinicio o borrado de la base de datos.
