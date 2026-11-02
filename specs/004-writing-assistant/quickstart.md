# Guía de validación: Módulo Tools y Writing Assistant

Pasos para comprobar la spec ([spec.md](./spec.md)) de principio a fin. No sustituye al Principio VI: `npx tsc --noEmit`, `npm run lint` y `npm run build`.

## Prerrequisitos

- Supabase local corriendo (`npm run db:start`), **nunca** `db:reset`.
- `npm run dev`, con `ANTHROPIC_API_KEY` en `.env.local`.
- Sesión iniciada con la cuenta del dueño.
- La funcionalidad 003 presente en la rama.

Antes de empezar, guardar los conteos por tabla para SC-010, solo de lectura.

## Escenario 1: Llegar a la herramienta (Historia 4)

1. En el dashboard, abrir Tools. Esperado: aparece junto a los demás módulos, y estos siguen igual.
2. Abrir Writing Assistant. Esperado: 2 clics en total (SC-001), y la tarjeta se ve como las de Talk with AI.
3. Volver al menú.
4. Abrir `/tools/writing-assistant` sin sesión. Esperado: lleva al inicio de sesión.

## Escenario 2: Inspector de sentido (Historia 1)

1. Con el cuadro vacío. Esperado: el botón no se puede usar.
2. Escribir `I am agree with this change.` y pulsar el botón. Esperado: el botón queda deshabilitado mientras revisa, y aparece una versión más natural en el otro cuadro, en menos de 5 segundos (SC-002). El texto original no cambia.
3. Pulsar copiar y pegar en otra aplicación. Esperado: el texto exacto, y la confirmación en pantalla (SC-006).
4. Escribir `I agree with this change.` y pulsar el botón. Esperado: `This sentence looks good.`, sin ninguna sugerencia, y no se ofrece copiar. Repetir con dos oraciones correctas. Esperado: `This paragraph looks good.`
5. Escribir un párrafo con un problema de redacción. Esperado: la recomendación cubre el párrafo y no agrega información.
6. Escribir una palabra bien escrita pero mal usada, como `Their is a bug in the release.`. Esperado: no sale en rojo, y el inspector la corrige.
7. Escribir en español. Esperado: indica que solo revisa inglés, sin traducir.
8. Con una recomendación visible, cambiar el texto. Esperado: sigue visible con el aviso de versión anterior.

## Escenario 3: Palabras en rojo (Historia 2)

1. Escribir sin detenerse `I recieve teh report `. Esperado: `recieve` se pone roja al escribir el espacio, sin esperar a una pausa y aunque se siga escribiendo (SC-003). El cursor no salta.
2. Escribir `recie` y seguir. Esperado: una palabra a medio escribir no parpadea en rojo.
3. Dejar `recie` al final y esperar un segundo. Esperado: se marca.
4. Clic derecho sobre una palabra marcada. Esperado: menú con las opciones. Al elegir una, se reemplaza solo esa aparición, y la marca desaparece.
5. Clic derecho sobre una palabra sin marcar. Esperado: el menú habitual, con pegar.
6. Comprobar que el navegador no añade su propio subrayado en el cuadro.
7. Con un texto largo y barra de desplazamiento, desplazarse y escribir. Esperado: las marcas siguen alineadas con su palabra, y el clic derecho funciona sobre ellas.
8. Con el menú abierto, cambiar el texto. Esperado: el menú se cierra y no se reemplaza ninguna otra palabra.

**SC-004**: medir con 10 oraciones **nuevas**, que no estén en [research.md](./research.md), con errores de escritura conocidos. Esperado: se marcan todos, y la primera opción acierta en al menos 9 de cada 10.

**SC-005**: pegar 10 oraciones de trabajo correctas, con `API`, `QA`, `standup`, `backend`, `useState` y `GitHub`. Esperado: ninguna palabra marcada.

## Escenario 4: Fix all y Undo (Historia 3)

1. Sin marcas. Esperado: `Fix all` no se puede usar.
2. Con varias marcas, pulsarlo. Esperado: todas quedan corregidas, y el resto del texto no cambia.
3. Pulsar `Undo`. Esperado: el texto idéntico al original (SC-009).
4. Con una palabra sin opciones, como una cadena de letras al azar. Esperado: se queda como está y sigue marcada, con `No suggestions`.
5. Tras `Fix all`, seguir escribiendo. Esperado: `Undo` desaparece.

## Escenario 5: Protección

1. Sin sesión o con un token inventado, enviar una petición a la ruta. Esperado: 401, sin llamada al proveedor.
2. Con sesión, enviar más de 5000 caracteres a la ruta. Esperado: 413.
3. En la pantalla, escribir más de 5000 caracteres. Esperado: un aviso, nada enviado, y el texto intacto.
4. Enviar `{` como cuerpo, y `level` con un valor no válido. Esperado: 400.
5. Simular sesión vencida (quickstart de 003, escenario 3) y pulsar el inspector. Esperado: el aviso de sesión, y el texto intacto. Tras iniciar sesión, reintentar funciona.
6. Con la llave de Anthropic inválida temporalmente, pulsar el inspector. Esperado: mensaje claro, sin detalles del proveedor, y el texto intacto. **Restaurar la llave al terminar.**

## Escenario 6: Sin gasto ni datos nuevos

1. Abrir la pestaña de red del navegador y escribir un párrafo. Esperado: ninguna llamada a `/api/writing-assistant` hasta pulsar el botón (SC-007).
2. Repetir los conteos por tabla. Esperado: iguales a los iniciales, salvo lo que el dueño haya hecho en otras partes de la app (SC-010).
