# Guía de validación: Menú de navegación siempre visible

Pasos para comprobar la spec ([spec.md](./spec.md)) de principio a fin. No sustituye al Principio VI: `npx tsc --noEmit`, `npm run lint` y `npm run build`, obligatorio porque se mueven rutas.

## Estado de la verificación (2026-11-13)

| Escenario | Estado | Quién | Lo comprobado |
|---|---|---|---|
| 1. El menú en todas las pantallas | Verificado | Dueño, con registros revisados por Claude | Todas las pantallas abiertas, recargas completas y la sección conservada en Grammar. Sin sesión, `/`, `/reset-password` y `/dashboard?section=grammar` no muestran el menú (T040, T042) |
| 2. Preguntar antes de perder trabajo | Verificado | Dueño | La pregunta en el Writing Assistant, "Stay", "Leave", "Log out" y el aviso al recargar. El diálogo no deja rastro en los registros (T043) |
| 3. Salir sin preguntas | Verificado | Dueño | Talk recién abierto y Shadowing en su pantalla inicial salen sin preguntar (T043) |
| 4. Audio y micrófono al salir | Verificado | Dueño, con registros revisados por Claude | El diálogo de Listening se detiene al salir por el menú (T044) |
| 5. Ruta de migas | Verificado | Dueño | Ruta de migas en cada módulo y "← Back" desde la segunda fase. El destino al terminar una lección o un capítulo no se probó aparte (T042) |
| 6. Todo sigue igual | Parcial | Dueño | La barra de Talk no tapa el menú, y se corrigió su solapamiento con el cuadro de vocabulario. Sin verificar: enviar una respuesta en Talk con el desplazamiento automático, y el cambio de nivel desde una lección (T045) |
| 7. Sin cambios en los datos | Verificado | Claude | Los conteos solo cambian por uso real: 6 temas de Talk, 1 palabra y 1 capítulo empezado (T046) |

## Prerrequisitos

- Supabase local corriendo (`npm run db:start`), **nunca** `db:reset`.
- `npm run dev`, y sesión iniciada con la cuenta del dueño.
- Antes de empezar, guardar los conteos por tabla para SC-008, solo de lectura.
- Ventana de escritorio de 1280 píxeles de ancho o más.

## Escenario 1: El menú en todas las pantallas (Historia 1)

1. Abrir cada pantalla: las 6 secciones, una lección, un capítulo, Talk en sus dos modos, Shadowing y Writing Assistant. Esperado: el menú siempre visible, con las mismas entradas y en el mismo orden, y el nombre, el nivel y "Log out" en el encabezado.
2. En cada una, mirar qué entrada está resaltada. Esperado: la de la tabla de [research §3](./research.md).
3. Desde una lección sin nada pendiente, pulsar Grammar. Esperado: la lista de capítulos, con 1 clic (SC-001).
4. Recargar en cada una de las 6 secciones. Esperado: sigue en la misma (SC-005).
5. Abrir `/dashboard?section=xyz`. Esperado: Learning path.
6. Cerrar sesión y abrir `/` y `/reset-password`. Esperado: sin menú.
7. Sin sesión, abrir `/dashboard?section=grammar`. Esperado: lleva al inicio de sesión, sin mostrar el menú ni un instante.

## Escenario 2: Preguntar antes de perder trabajo (Historia 2)

Para cada fila, crear el trabajo pendiente y pulsar otra entrada del menú. Esperado: el diálogo, con "Stay" seleccionado (SC-002).

| Pantalla | Cómo crear el trabajo pendiente |
|---|---|
| Lección, Listening | Escribir una respuesta sin comprobar |
| Lección, Comprehension | Escribir una respuesta sin comprobar |
| Lección, Speaking | Grabar, y también con la transcripción sin evaluar |
| Lección, Expression | Escribir sin enviar, y también mientras evalúa |
| Capítulo, Practice | Elegir o escribir una respuesta sin comprobar |
| Capítulo, Expression | Escribir sin enviar |
| Talk, con tus palabras | Responder una vez, sin llegar a la retroalimentación |
| Talk, modo abierto | Dictar una respuesta sin enviarla |
| Shadowing | Empezar el ejercicio y repetir una palabra |
| Writing Assistant | Escribir cualquier texto |

En cada caso:

1. Pulsar "Stay", `Esc` o fuera del diálogo. Esperado: todo idéntico, incluido el texto, la grabación, la fase y la conversación (SC-004).
2. Repetir y pulsar "Leave". Esperado: el destino elegido, sin datos a medias guardados.
3. Con trabajo pendiente, pulsar la sección en la ruta de migas y "Log out". Esperado: el mismo diálogo.
4. Con trabajo pendiente, recargar la página. Esperado: el aviso del navegador.
5. Con trabajo pendiente, `Cmd`+clic en el menú. Esperado: se abre otra pestaña sin preguntar, y esta queda intacta.

## Escenario 3: Salir sin preguntas (Historia 2)

Salir por el menú en cada caso. Esperado: ninguna pregunta (SC-003).

1. Una lección en Immersion, sin tocar nada, y con un audio sonando.
2. Una lección tras comprobar o enviar todas las respuestas.
3. Talk recién abierto, con el tema y el primer mensaje de la IA, pero sin responder.
4. Talk tras recibir la retroalimentación final.
5. Shadowing en su pantalla inicial, y tras terminar un ejercicio.
6. Writing Assistant con el cuadro vacío.

## Escenario 4: Audio y micrófono al salir

1. En Listening, reproducir el diálogo y salir por el menú. Esperado: el audio se detiene.
2. En Speaking, grabar, pulsar "Leave". Esperado: el indicador de micrófono del navegador se apaga.
3. Repetir el paso 2 en Shadowing y en Talk.

## Escenario 5: Ruta de migas (Historia 3)

1. En cada pantalla de módulo, mirar la ruta de migas. Esperado: la de [research §8](./research.md), y sin "← Dashboard".
2. En una lección, pasar a la segunda fase y pulsar "← Back". Esperado: vuelve a la primera fase. En la primera fase no aparece "← Back".
3. Pulsar la sección en la ruta de migas. Esperado: la lista de su sección.
4. Terminar una lección. Esperado: Learning path. Terminar un capítulo. Esperado: Grammar.

## Escenario 6: Todo sigue igual (FR-017)

1. Recorrer el escenario 2 del [quickstart de 003](../003-api-protection/quickstart.md): una lección, un capítulo, Shadowing, Talk en los dos modos y guardar una palabra. Esperado: igual que antes, sin pasos nuevos (SC-006).
2. Cambiar de nivel desde una lección. Esperado: la lección sigue abierta, y al volver a Learning path aparece la lista del nuevo nivel.
3. En Talk, con una conversación larga, comprobar que sigue bajando sola al llegar mensajes, y que la barra para responder no tapa el menú.
4. En 1280 píxeles de ancho, revisar cada pantalla. Esperado: sin desplazamiento horizontal (SC-007).
5. En una ventana estrecha, comprobar que el menú pasa a una fila horizontal y sigue funcionando.

## Escenario 7: Sin cambios en los datos

1. Repetir los conteos por tabla. Esperado: iguales a los iniciales, salvo lo que se haya guardado al completar actividades en el escenario 6 (SC-008).
