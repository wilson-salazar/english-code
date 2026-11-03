# Especificación de la funcionalidad: Protección de la API y del acceso a la aplicación

**Rama de la funcionalidad**: `003-api-protection`

**Creado**: 2026-11-01

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Protección de las rutas de la API y del acceso a la aplicación. English Code es una app personal con un único usuario (el dueño, confirmado por él). Corre en su Mac y quiere abrirla desde su iPhone por una red privada. Hoy cualquiera que llegue al servidor puede usar las funciones que gastan créditos de proveedores de IA y voz, sin iniciar sesión. Debe cumplirse: (1) las 7 funciones que gastan créditos solo responden a una persona con sesión válida, sin gastar créditos en caso contrario y con un mensaje claro; (2) una página de otro sitio no puede gastar créditos aprovechando el navegador del dueño; (3) cada función rechaza entradas excesivamente grandes antes de llamar al proveedor, sin afectar el uso normal; (4) no se pueden crear cuentas nuevas, y la cuenta y los datos del dueño se conservan; (5) el servidor de la aplicación solo escucha en el propio equipo de forma predeterminada; (6) los errores no revelan detalles internos de los proveedores, y un fallo del proveedor en las evaluaciones devuelve un error controlado. Fuera de alcance: red privada y acceso desde iPhone; cambios en RLS; límites de frecuencia salvo que resulten necesarios; puertos de la base de datos y firewall, que el dueño gestiona por separado. Ningún cambio puede borrar datos."

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Solo el dueño con sesión gasta créditos (Prioridad: P1)

Como dueño de la aplicación, quiero que las funciones que gastan créditos de los proveedores de IA y de voz solo respondan a quien tenga una sesión válida, para que nadie más que llegue al servidor pueda gastar mis créditos.

**Por qué esta prioridad**: es el riesgo que motivó esta funcionalidad y el requisito previo para abrir la aplicación desde otro dispositivo. Hoy una petición sin sesión a la función de voz devuelve audio y gasta créditos.

**Prueba independiente**: enviar a cada una de las 7 funciones una petición sin sesión, y otra con una sesión inválida, y confirmar que todas se rechazan y que los proveedores no reciben ninguna llamada.

**Escenarios de aceptación**:

1. **Dado** que una persona no tiene sesión, **Cuando** pide cualquiera de las 7 funciones, **Entonces** la petición se rechaza como no autorizada y no se llama al proveedor.
2. **Dado** una sesión vencida, alterada o inventada, **Cuando** se pide cualquiera de las 7 funciones, **Entonces** la petición se rechaza igual, sin llamar al proveedor.
3. **Dado** que el dueño visita una página de otro sitio mientras tiene su sesión iniciada, **Cuando** esa página intenta pedir cualquiera de las 7 funciones, **Entonces** la petición se rechaza y no se gastan créditos.

---

### Historia de usuario 2 - El dueño sigue usando todo igual (Prioridad: P1)

Como dueño con la sesión iniciada, quiero que todos los módulos funcionen como hasta ahora, y que un rechazo por sesión vencida me lo expliquen sin hacerme perder lo que escribí.

**Por qué esta prioridad**: la protección no sirve si rompe el aprendizaje diario. Las 7 funciones se usan desde lecciones, capítulos, Shadowing, Talk with AI y el vocabulario, así que un olvido en cualquier pantalla dejaría esa pantalla sin funcionar.

**Prueba independiente**: con sesión iniciada, recorrer un flujo de cada módulo y confirmar que el audio, las evaluaciones, la conversación, la generación de oraciones y la traducción funcionan sin pasos nuevos.

**Escenarios de aceptación**:

1. **Dado** que el dueño tiene la sesión iniciada, **Cuando** usa lecciones, capítulos, Shadowing, Talk with AI y el vocabulario, **Entonces** cada función responde como antes, sin pedirle ningún paso adicional.
2. **Dado** que el dueño deja la aplicación abierta más tiempo del que dura un periodo de sesión, **Cuando** vuelve a usar una función, **Entonces** la sesión se renueva sola siempre que siga siendo renovable y la función responde.
3. **Dado** que la sesión venció y ya no se puede renovar, **Cuando** el dueño envía una respuesta o pide una evaluación, **Entonces** ve un mensaje claro que le pide iniciar sesión de nuevo y lo que escribió se conserva en pantalla.
4. **Dado** que la sesión venció y ya no se puede renovar, **Cuando** la aplicación intenta reproducir audio, **Entonces** el estudiante ve el mismo mensaje una sola vez, en lugar de un fallo silencioso o de un mensaje repetido por cada audio.

---

### Historia de usuario 3 - No se pueden crear cuentas nuevas (Prioridad: P2)

Como único usuario, quiero que nadie pueda crearse una cuenta, para que exigir sesión proteja de verdad las funciones que gastan créditos.

**Por qué esta prioridad**: hoy cualquiera que llegue a la aplicación puede registrarse sin confirmar su correo y obtener una sesión válida, lo que anularía la Historia 1.

**Prueba independiente**: intentar registrarse desde la pantalla de inicio y directamente contra el servicio de autenticación, y confirmar que ambas fallan, que el número de cuentas sigue siendo 1 y que el dueño puede iniciar sesión.

**Escenarios de aceptación**:

1. **Dado** la pantalla de inicio, **Cuando** alguien la abre, **Entonces** no se le ofrece crear una cuenta.
2. **Dado** una petición de registro enviada directamente al servicio de autenticación, **Cuando** se procesa, **Entonces** se rechaza y no se crea ninguna cuenta.
3. **Dado** una petición para obtener una sesión anónima, sin cuenta, **Cuando** se procesa, **Entonces** se rechaza.
4. **Dado** la cuenta existente del dueño, **Cuando** inicia sesión con su contraseña o la restablece desde "forgot password", **Entonces** todo funciona como antes y sus datos siguen intactos.

---

### Historia de usuario 4 - Entradas demasiado grandes no llegan al proveedor (Prioridad: P2)

Como dueño, quiero que cada función rechace entradas desproporcionadas antes de llamar al proveedor, para que una sola petición, sea un error o un abuso, no pueda gastar una cantidad grande de créditos.

**Por qué esta prioridad**: la función de voz cobra según la cantidad de texto y ni ella ni las evaluaciones tienen tope. Es una segunda barrera detrás de la sesión, por eso va después.

**Prueba independiente**: enviar con sesión una entrada por encima del límite a cada función y confirmar el rechazo sin llamada al proveedor; después, comprobar que el contenido real más largo de lecciones y capítulos se acepta.

**Escenarios de aceptación**:

1. **Dado** una entrada por encima del límite de una función, **Cuando** se pide esa función, **Entonces** se rechaza con un error claro, sin llamar al proveedor.
2. **Dado** el texto más largo de una lección o de un capítulo, o el mensaje más largo de la IA, **Cuando** se pide su audio, **Entonces** se acepta y suena.
3. **Dado** una respuesta larga pero realista del estudiante, **Cuando** se envía a evaluar o a la conversación, **Entonces** se acepta y lo escrito no se recorta sin aviso.
4. **Dado** una petición malformada o a la que le faltan datos obligatorios, **Cuando** se pide cualquiera de las funciones, **Entonces** se rechaza con un error controlado, sin llamar al proveedor.

---

### Historia de usuario 5 - El servidor solo escucha en el propio equipo (Prioridad: P2)

Como dueño, quiero que el servidor de la aplicación no acepte conexiones de la red local de forma predeterminada, para que nadie en mi Wi-Fi pueda alcanzarlo y para que el acceso desde otro dispositivo pase solo por la red privada de la etapa siguiente.

**Por qué esta prioridad**: reduce quién puede intentar usar el servidor. Va en P2 porque se puede entregar sola y porque la protección real de los créditos la dan las Historias 1 y 3.

**Prueba independiente**: arrancar la aplicación de la forma habitual, abrirla en el propio equipo y confirmar que desde otro dispositivo de la misma red no se conecta.

**Escenarios de aceptación**:

1. **Dado** que la aplicación se arrancó con el comando habitual o con el arranque automático del equipo, **Cuando** se abre en el propio equipo, **Entonces** funciona con normalidad.
2. **Dado** esa misma aplicación corriendo, **Cuando** otro dispositivo de la red local intenta conectarse a ella, **Entonces** la conexión falla.

---

### Historia de usuario 6 - Los errores no revelan detalles internos (Prioridad: P3)

Como dueño, quiero que los errores de los proveedores se manejen de forma controlada, para que la pantalla muestre un mensaje útil y las respuestas no expongan información interna.

**Por qué esta prioridad**: es un riesgo bajo una vez que solo el dueño puede llamar a las funciones, pero las evaluaciones hoy no controlan el fallo del proveedor.

**Prueba independiente**: provocar un fallo del proveedor en cada función y revisar la respuesta recibida: debe ser un error genérico, sin el texto del proveedor.

**Escenarios de aceptación**:

1. **Dado** un fallo del proveedor de voz, **Cuando** se pide audio, **Entonces** la respuesta es un error genérico, sin el detalle devuelto por el proveedor.
2. **Dado** un fallo del proveedor de IA durante una evaluación, **Cuando** se pide esa evaluación, **Entonces** la respuesta es un error controlado, el estudiante ve un mensaje claro y su respuesta se conserva.
3. **Dado** un fallo de cualquier proveedor, **Cuando** el dueño necesita diagnosticarlo, **Entonces** el detalle está disponible en el registro del servidor.

---

### Casos límite

- **La sesión vence a mitad de una conversación de Talk with AI**: la respuesta del estudiante se conserva y, tras volver a iniciar sesión, puede reintentar sin escribirla de nuevo si sigue en la misma pantalla. Si vuelve a entrar desde el inicio, aplica el comportamiento actual de recarga: la conversación queda en el historial y empieza un tema nuevo.
- **El audio se rechaza por sesión vencida en una pantalla donde el texto ya se muestra**: el texto sigue visible, igual que cuando el audio falla hoy; además se muestra el aviso de sesión vencida.
- **Se cierra la sesión en otra pestaña**: la siguiente petición de esta pestaña se rechaza y aplica el mismo aviso.
- **Falla la comprobación de la sesión** porque el servicio de autenticación no responde: la petición se rechaza, sin llamar al proveedor; no se da por válida una sesión que no se pudo comprobar. El mensaje dice que no se pudo comprobar la sesión, no que venció.
- **Una entrada supera el límite solo por poco**: se rechaza igual; el error indica que el texto es demasiado largo.
- **Funciones que hoy ya recortan su entrada** (por ejemplo, los últimos 20 mensajes de Talk with AI o las primeras 10 palabras a traducir): conservan ese recorte, que es comportamiento especificado de esos módulos; el límite nuevo se aplica además al tamaño total de la petición.
- **Hay que crear una cuenta de prueba en el futuro**: se crea con las herramientas de administración del equipo, no desde la aplicación.
- **El dueño olvida su contraseña**: restablecerla sigue funcionando, porque no crea una cuenta nueva.

## Requisitos *(obligatorio)*

### Requisitos funcionales

**Sesión**

- **FR-001**: Las 7 funciones que gastan créditos (evaluar respuesta escrita, evaluar respuesta hablada, evaluar ejercicio de capítulo, conversación con IA, generar oración de Shadowing, traducir vocabulario y texto a voz) DEBEN responder únicamente a peticiones con una sesión válida de una cuenta existente.
- **FR-002**: La validez de la sesión DEBE comprobarse en el servidor, antes de cualquier llamada al proveedor; lo que afirme el cliente sobre sí mismo no basta.
- **FR-003**: Una petición sin sesión, o con una sesión vencida, alterada, inventada o que no se pudo comprobar, DEBE rechazarse como no autorizada, sin llamar al proveedor.
- **FR-004**: Una página de otro sitio NO DEBE poder usar ninguna de las 7 funciones aprovechando la sesión del dueño en su navegador.
- **FR-005**: Toda función que se agregue en el futuro y gaste créditos DEBE aplicar la misma comprobación; la comprobación DEBE vivir en un único lugar reutilizable.

**Experiencia del dueño**

- **FR-006**: Con sesión válida, todos los módulos que usan las 7 funciones (lecciones, capítulos, Shadowing, Talk with AI y vocabulario) DEBEN comportarse como antes de este cambio, sin pasos adicionales.
- **FR-007**: La sesión DEBE renovarse sola mientras sea renovable, de modo que una sesión vieja pero renovable no cause un rechazo visible.
- **FR-008**: Cuando una función se rechace por sesión vencida, el estudiante DEBE ver un mensaje claro en inglés que le pida iniciar sesión de nuevo, una sola vez por episodio y no un fallo silencioso.
- **FR-009**: Lo que el estudiante escribió o dictó y aún no se ha procesado DEBE conservarse en pantalla cuando una petición se rechace.

**Tamaño de las entradas**

- **FR-010**: Cada una de las 7 funciones DEBE tener un límite de tamaño de entrada y rechazar lo que lo supere con un error claro, antes de llamar al proveedor.
- **FR-011**: Los límites NO DEBEN rechazar el uso normal: DEBEN aceptar el texto más largo existente en lecciones y capítulos, el mensaje más largo que produce la IA y una respuesta larga pero realista del estudiante.
- **FR-012**: Una petición malformada o sin los datos obligatorios DEBE rechazarse con un error controlado, sin llamar al proveedor.
- **FR-013**: Los recortes que ya aplican los módulos a su entrada DEBEN conservarse tal como están especificados.

**Cuentas**

- **FR-014**: NO DEBE poder crearse ninguna cuenta nueva, ni desde la aplicación ni directamente contra el servicio de autenticación, por ningún método de registro.
- **FR-015**: NO DEBEN poder obtenerse sesiones anónimas, sin cuenta.
- **FR-016**: La pantalla de inicio NO DEBE ofrecer el registro.
- **FR-017**: El inicio de sesión y el restablecimiento de contraseña de la cuenta existente DEBEN seguir funcionando.
- **FR-018**: La cuenta del dueño y todos sus datos DEBEN conservarse intactos. Ningún paso de esta funcionalidad puede borrar datos ni reiniciar la base; todo cambio de datos o de configuración DEBE aplicarse de forma incremental.

**Red**

- **FR-019**: El servidor de la aplicación DEBE aceptar de forma predeterminada solo conexiones del propio equipo, tanto con el comando habitual como con el arranque automático.

**Errores**

- **FR-020**: Las respuestas de error NO DEBEN incluir el texto, los códigos ni otros detalles internos de los proveedores; esos detalles DEBEN quedar solo en el registro del servidor.
- **FR-021**: Las 7 funciones DEBEN responder con un error controlado cuando falle el proveedor, incluidas las tres evaluaciones, que hoy no lo controlan.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: El 100% de las peticiones sin sesión válida a las 7 funciones se rechaza, y los proveedores reciben 0 llamadas por ellas.
- **SC-002**: El dueño completa con sesión iniciada un flujo de cada uno de los 5 módulos (lecciones, capítulos, Shadowing, Talk with AI y vocabulario) sin ningún paso nuevo y sin errores.
- **SC-003**: Una página de otro sitio abierta en el navegador del dueño, con su sesión iniciada, gasta 0 créditos.
- **SC-004**: El 100% de las entradas por encima del límite se rechaza antes de llamar al proveedor, y 0 textos existentes de lecciones y capítulos se rechazan.
- **SC-005**: Después de los intentos de registro por la aplicación y directamente contra el servicio de autenticación, sigue existiendo exactamente 1 cuenta.
- **SC-006**: Los datos del dueño tienen, al terminar, al menos los mismos registros que antes de empezar, por cada tabla, y el dueño puede iniciar sesión.
- **SC-007**: Desde otro dispositivo de la red local, la aplicación no conecta en el 100% de los intentos, y desde el propio equipo abre con normalidad.
- **SC-008**: Ante una sesión vencida, el estudiante ve el aviso y conserva lo escrito en el 100% de las pantallas que envían texto a una función.
- **SC-009**: Ninguna respuesta de error provocada por un fallo de proveedor contiene texto de ese proveedor.

## Supuestos

- El dueño es el único usuario (confirmado por él), y la base local tiene exactamente 1 cuenta, comprobado el 2026-11-01.
- La sesión es la que ya usa la aplicación para iniciar sesión; no se agrega un método de autenticación ni un proveedor nuevo.
- Las reglas de protección de datos por fila no cambian: están activas en las 16 tablas, comprobado el 2026-11-01. Esta funcionalidad protege las funciones que gastan créditos, no el acceso a los datos.
- Referencias para fijar los límites en el plan, medidas el 2026-11-01: la fase más larga de una lección ocupa 1500 caracteres y la de un capítulo 3333, ambas contando toda su estructura; el mensaje guardado más largo de la IA tiene 723 caracteres y el del estudiante 802; Talk with AI envía como máximo 20 mensajes de hasta 5000 caracteres cada uno.
- Los avisos que indican que falta configurar una llave se pueden conservar, porque solo los verá quien ya tenga sesión.
- Mientras no exista la red privada de la etapa siguiente, abrir la aplicación desde otro dispositivo deja de funcionar. El dueño lo aceptó al priorizar esta funcionalidad.
- La protección de las funciones es por sesión, y no se agregan límites de frecuencia: con un único usuario y sin registro, solo el dueño tiene sesión. Se reabre si el uso real lo pide.

### Fuera de alcance

- Instalar o configurar la red privada y el acceso desde el iPhone, incluido el acceso seguro necesario para el micrófono. Es la etapa siguiente y depende de esta.
- Cambiar las reglas de protección de datos por fila.
- Límites de frecuencia de peticiones.
- Cerrar los puertos de la base de datos o configurar el firewall del equipo, que el dueño gestiona por separado.

### Dependencias

- **La base de datos local no debe quedar abierta a la red.** La revisión del 2026-11-01 encontró que la base, su herramienta de administración y el servicio de autenticación aceptan conexiones de la red local, con el firewall del equipo apagado. Esta funcionalidad no lo corrige, y quien llegue a la base podría saltarse toda esta protección. El dueño lo gestiona por separado, y debe resolverse antes de considerar el conjunto protegido.
- **La red privada de la etapa siguiente** depende de esta funcionalidad, porque abrirá el acceso desde otro dispositivo.
