# Especificación de la funcionalidad: Módulo Tools y Writing Assistant

**Rama de la funcionalidad**: `004-writing-assistant`

**Creado**: 2026-11-01

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Quiero agregar en el menú un nuevo módulo llamado Tools; dentro de él la idea es que haya más de una opción, como está hoy el módulo de Talk with AI. Por ahora la primera herramienta se va a llamar Writing Assistant. Su función será ayudar a corregir texto, tanto a nivel de escritura como a nivel de sentido de la oración: si el usuario escribe una oración que no suena natural en inglés o merece un toque de corrección, el corrector le dirá que la oración es más natural de esta manera; si hay un error de escritura, marcará las palabras que merecen corrección. La vista tendrá un cuadro para escribir texto, un botón para activar el inspector de sentido de la oración, un botón de copiar la recomendación si la hay, y esta recomendación debe estar en otro cuadro. Si hay palabras incorrectas, no estoy seguro de si con el navegador sea suficiente; si no, que tenga la opción de que las palabras salgan en rojo y con clic derecho salgan las opciones correctas, además de un botón de arreglarlas todas de una vez."

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Ver cómo suena más natural lo que escribí (Prioridad: P1)

Como estudiante que escribe en inglés para su trabajo, quiero pedir una revisión del sentido de lo que escribí y recibir una versión más natural en un cuadro aparte, para mejorar mi texto y copiarlo a donde lo necesite.

**Por qué esta prioridad**: es el mayor aporte de la herramienta. Una oración puede estar bien escrita y aun así no sonar natural, y eso ningún corrector de palabras lo detecta. Sola, esta historia ya da una herramienta útil.

**Prueba independiente**: escribir una oración correcta pero poco natural, activar el inspector y confirmar que aparece una versión más natural en el cuadro de recomendación, y que se puede copiar y pegar en otra aplicación.

**Escenarios de aceptación**:

1. **Dado** un texto que no suena natural, **Cuando** el estudiante activa el inspector, **Entonces** aparece en un cuadro separado una versión más natural que conserva lo que quiso decir, y su texto original no cambia.
2. **Dado** un texto que ya suena natural, **Cuando** activa el inspector, **Entonces** se le indica que no hay nada que mejorar, y no se ofrece copiar ninguna recomendación.
3. **Dado** que hay una recomendación, **Cuando** pulsa copiar, **Entonces** el texto recomendado queda listo para pegar, y la pantalla confirma que se copió.
4. **Dado** un cuadro de texto vacío, **Cuando** mira el inspector, **Entonces** no puede activarlo.
5. **Dado** que el inspector está trabajando, **Cuando** el estudiante espera, **Entonces** ve que la revisión está en curso y el botón queda deshabilitado hasta que termine.

---

### Historia de usuario 2 - Ver y corregir las palabras mal escritas (Prioridad: P2)

Como estudiante, quiero que las palabras mal escritas salgan en rojo y poder elegir la correcta con clic derecho, para corregirlas sin salir del texto ni depender de la configuración de mi navegador.

**Por qué esta prioridad**: los errores de escritura son los más frecuentes y rápidos de corregir, pero la herramienta ya aporta valor sin esto gracias a la Historia 1.

**Prueba independiente**: escribir un texto con errores de escritura, confirmar que esas palabras se marcan en rojo sin pulsar ningún botón, y corregir una con clic derecho.

**Escenarios de aceptación**:

1. **Dado** que el estudiante está escribiendo, **Cuando** termina una palabra mal escrita, **Entonces** esa palabra aparece en rojo de inmediato, aunque siga escribiendo, sin pulsar ningún botón y sin perder el punto donde estaba escribiendo.
2. **Dado** una palabra marcada, **Cuando** hace clic derecho sobre ella, **Entonces** ve las opciones correctas, y al elegir una, esa palabra se reemplaza y deja de estar marcada.
3. **Dado** un texto sin errores de escritura, **Cuando** lo escribe, **Entonces** no se marca ninguna palabra.
4. **Dado** una palabra sin marcar, **Cuando** hace clic derecho sobre ella, **Entonces** ve el menú habitual, con opciones como pegar.

---

### Historia de usuario 3 - Arreglar todas las palabras de una vez (Prioridad: P3)

Como estudiante, quiero un botón que arregle de una sola vez todas las palabras marcadas, para no corregirlas una a una cuando son varias.

**Por qué esta prioridad**: ahorra tiempo, pero depende de la Historia 2 y solo se nota en textos con varios errores.

**Prueba independiente**: escribir un texto con varias palabras mal escritas, pulsar el botón y confirmar que todas quedan corregidas y que el cambio se puede deshacer.

**Escenarios de aceptación**:

1. **Dado** varias palabras marcadas, **Cuando** pulsa arreglarlas todas, **Entonces** cada una se reemplaza por su opción más probable, y el resto del texto no cambia.
2. **Dado** que acaba de arreglarlas todas, **Cuando** quiere volver atrás, **Entonces** puede deshacer el cambio y recuperar su texto como estaba.
3. **Dado** que ninguna palabra está marcada, **Cuando** mira el botón, **Entonces** no puede usarlo.
4. **Dado** una palabra marcada sin ninguna opción correcta, **Cuando** pulsa arreglarlas todas, **Entonces** esa palabra se queda como está y sigue marcada.

---

### Historia de usuario 4 - Encontrar las herramientas en el menú (Prioridad: P1)

Como estudiante, quiero un módulo Tools en el menú que muestre las herramientas disponibles, como hoy muestra sus opciones Talk with AI, para llegar al Writing Assistant y a las que se agreguen más adelante.

**Por qué esta prioridad**: sin esta entrada, las demás historias no son accesibles.

**Prueba independiente**: abrir el menú, entrar a Tools, ver la opción Writing Assistant, abrirla y volver al menú.

**Escenarios de aceptación**:

1. **Dado** el menú principal, **Cuando** el estudiante lo mira, **Entonces** aparece Tools junto a los demás módulos, y los módulos existentes siguen igual.
2. **Dado** el módulo Tools, **Cuando** entra, **Entonces** ve una tarjeta de Writing Assistant con su descripción y un botón para abrirla, con la misma presentación que las opciones de Talk with AI.
3. **Dado** el Writing Assistant abierto, **Cuando** quiere salir, **Entonces** puede volver al menú.

---

### Casos límite

- **Texto demasiado largo**: al superar el máximo permitido, se avisa con claridad antes de enviar nada, y el texto se conserva.
- **Texto que no está en inglés**: el inspector indica que solo revisa inglés, y no ofrece una traducción como recomendación.
- **Nombres propios, siglas y términos técnicos** (por ejemplo `API`, `QA`, `standup`, nombres de productos o fragmentos de código): no deben marcarse como errores solo por no ser palabras comunes, porque la audiencia los usa a diario.
- **Palabra correcta pero mal usada** (por ejemplo, *their* por *there*): la señala el inspector de sentido, no la marca de palabras.
- **El texto cambia después de recibir una recomendación**: la recomendación sigue visible y copiable, con un aviso de que corresponde a una versión anterior, hasta que se revise de nuevo.
- **El texto cambia mientras el inspector trabaja**: el resultado se presenta como correspondiente a una versión anterior, y lo escrito no se pierde.
- **El texto cambia con un menú de opciones abierto**: el menú se cierra, y no se reemplaza una palabra distinta a la que se eligió.
- **Palabra repetida varias veces con el mismo error**: cada aparición se marca, y corregir una no cambia las otras, salvo con el botón de arreglarlas todas.
- **La revisión falla** (servicio caído o sin conexión): aparece un mensaje claro con la opción de reintentar, y el texto se conserva. Si la que falla es la revisión de palabras, el inspector sigue disponible.
- **Sesión vencida**: se muestra el aviso de sesión ya existente, y el texto se conserva para reintentar tras iniciar sesión.
- **No se puede copiar** (el navegador lo impide): se avisa, y el texto recomendado se puede seleccionar a mano.
- **Respuesta vacía o inválida del servicio**: se trata como un fallo; nunca se presenta como "no hay nada que mejorar".

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Módulo Tools**

- **FR-001**: El menú principal DEBE incluir un módulo llamado Tools, sin alterar los módulos existentes.
- **FR-002**: El módulo Tools DEBE presentar cada herramienta como una opción con nombre, descripción y botón para abrirla, con la misma presentación que las opciones de Talk with AI.
- **FR-003**: El módulo DEBE admitir nuevas herramientas sin rediseñar su pantalla. Por ahora solo incluye Writing Assistant.
- **FR-004**: El Writing Assistant DEBE poder abrirse desde Tools, permitir volver al menú y exigir sesión iniciada, como el resto de la aplicación.

**Cuadro de texto**

- **FR-005**: La vista DEBE tener un cuadro para escribir o pegar texto en inglés, de una o de varias oraciones.
- **FR-006**: El texto admitido DEBE tener un máximo de 5000 caracteres. Al superarlo, se avisa, y no se envía ninguna revisión.

**Inspector de sentido**

- **FR-007**: La vista DEBE tener un botón que active el inspector de sentido. Cada pulsación revisa una vez el texto actual, y no se revisa nada sin pulsarlo.
- **FR-008**: El inspector DEBE evaluar si la oración o el párrafo está bien redactado, suena natural y tiene sentido en inglés, incluido el uso de palabras bien escritas pero equivocadas para el contexto.
- **FR-009**: Si hay algo que mejorar, la recomendación DEBE aparecer en un cuadro separado del texto del estudiante, y conservar lo que quiso decir, sin agregar información nueva.
- **FR-010**: Si no hay nada que mejorar, la vista DEBE indicarlo con claridad, sin recomendación.
- **FR-011**: La recomendación NO DEBE modificar el texto del estudiante.
- **FR-012**: La recomendación DEBE ser adecuada al nivel del estudiante (A2 a C1), sin dejar de sonar natural en un contexto profesional de tecnología.
- **FR-013**: La vista DEBE tener un botón para copiar la recomendación, disponible solo cuando la hay, que copie únicamente su texto y confirme que se copió.
- **FR-014**: Mientras la revisión está en curso, la vista DEBE indicarlo y mantener deshabilitado el botón del inspector.

**Palabras mal escritas**

- **FR-015**: La vista DEBE marcar en rojo cada palabra mal escrita dentro del propio cuadro de texto en cuanto se termina de escribir, sin esperar una pausa, sin mover el cursor ni interrumpir la escritura. La palabra que aún se está escribiendo no se evalúa hasta que se termina con un espacio o un signo de puntuación, o hasta que el estudiante deja de escribir, para que no se marquen palabras a medio escribir.
- **FR-016**: Esta función NO DEBE depender del corrector del navegador ni de la configuración de idioma del equipo, y el corrector del navegador NO DEBE sumar sus propias marcas dentro del cuadro.
- **FR-017**: Con clic derecho sobre una palabra marcada, la vista DEBE mostrar las opciones correctas.
- **FR-018**: Al elegir una opción, DEBE reemplazarse solo esa aparición de la palabra, y la marca DEBE desaparecer.
- **FR-019**: El clic derecho fuera de una palabra marcada DEBE conservar el menú habitual del navegador.
- **FR-020**: La vista DEBE tener un botón para arreglar de una vez todas las palabras marcadas con su opción más probable, disponible solo cuando hay alguna marcada.
- **FR-021**: Las palabras sin opciones DEBEN quedar sin cambios y seguir marcadas, indicando que no hay sugerencias.
- **FR-022**: Tras arreglarlas todas, DEBE poder deshacerse el cambio y recuperar el texto anterior.
- **FR-023**: Revisar las palabras NO DEBE gastar créditos de proveedores en cada pulsación de tecla.

**Protección y errores**

- **FR-024**: Toda revisión que gaste créditos de proveedores DEBE exigir una sesión válida y rechazar entradas por encima del límite antes de llamar al proveedor, como establece la funcionalidad 003.
- **FR-025**: Ante un fallo, sesión vencida o respuesta inválida, la vista DEBE mostrar un mensaje claro, sin detalles internos de los proveedores, y conservar el texto escrito.
- **FR-026**: El texto y las recomendaciones NO DEBEN guardarse en la base de datos ni en un historial.

### Entidades clave

- **Herramienta**: una opción del módulo Tools, con nombre, descripción y destino. No requiere almacenamiento.
- **Texto en revisión**: lo que escribe el estudiante. Existe solo mientras la vista está abierta.
- **Palabra marcada**: una aparición de una palabra mal escrita, con su posición en el texto y sus opciones ordenadas por probabilidad.
- **Recomendación**: la versión más natural del texto, junto con la indicación de si corresponde a la versión actual o a una anterior.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El estudiante llega desde el menú al Writing Assistant en un máximo de 2 clics.
- **SC-002**: En un texto normal de hasta 500 caracteres, el inspector muestra su resultado en menos de 5 segundos.
- **SC-003**: Una palabra mal escrita aparece en rojo menos de 1 segundo después de terminarla, aunque el estudiante siga escribiendo.
- **SC-004**: En un conjunto de 10 oraciones de prueba con errores de escritura conocidos, se marcan todos los errores, y la primera opción es la correcta en al menos 9 de cada 10.
- **SC-005**: En un conjunto de 10 oraciones de trabajo correctas, con términos técnicos como `API`, `QA` y `standup`, ninguna palabra correcta se marca como error.
- **SC-006**: Copiar la recomendación y pegarla en otra aplicación reproduce su texto exacto en el 100% de los intentos.
- **SC-007**: Con la herramienta abierta y escribiendo, sin pulsar el inspector, no se gasta ningún crédito por pulsación de tecla.
- **SC-008**: Ningún fallo del servicio ni vencimiento de sesión hace perder el texto escrito.
- **SC-009**: Arreglar todas las palabras y deshacerlo devuelve el texto idéntico al original en el 100% de los intentos.
- **SC-010**: Los conteos por tabla de la base de datos no cambian por usar la herramienta.

## Supuestos

- **Único usuario**: la aplicación es personal, con el dueño como único usuario.
- **Dependencia de 003**: esta funcionalidad se apoya en la protección de la funcionalidad 003, incluidos sus límites, la exigencia de sesión y el aviso de sesión vencida. Esa funcionalidad aún no está fusionada en la rama principal.
- **Corrector del navegador**: no basta para lo que se pidió. Depende del idioma configurado en cada equipo, se comporta distinto según el navegador y no permite a una página conocer sus sugerencias, de modo que no podría ofrecer "arreglarlas todas". Por eso la aplicación ofrece su propia revisión de palabras (FR-016).
- **Activar el inspector** (confirmado por el dueño): cada clic revisa una vez, y da una sugerencia si hace falta.
- **Revisión de palabras automática** (confirmado por el dueño): las palabras se marcan solas mientras se escribe, sin botón y sin esperar una pausa.
- **Corrector, no explicación** (confirmado por el dueño): la herramienta es un corrector de texto. Su valor es revisar la redacción y marcar los errores de escritura, no enseñar los motivos.
- **Solo inglés**: la herramienta revisa inglés. La interfaz también está en inglés, como el resto de la aplicación.
- **Solo web**: la aplicación es solo web y esta funcionalidad se diseña para el navegador de escritorio.
- **Sin base de datos**: no requiere tablas nuevas ni cambios de esquema, por lo que no toca los datos existentes.

## Fuera del alcance

- Guardar un historial de textos o de recomendaciones.
- Explicar por qué se hace cada recomendación, o enseñar la regla gramatical.
- Reemplazar con un botón el texto del estudiante por la recomendación.
- Traducir textos o revisar otros idiomas.
- Agregar otras herramientas a Tools, además de Writing Assistant.
- Uso con pantallas táctiles o en una versión móvil.
- Cualquier reinicio o borrado de la base de datos.
