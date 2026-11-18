# Guía de validación: Ahorro de créditos de IA y audio

Pasos para comprobar la spec ([spec.md](./spec.md)). No sustituye al Principio VI: `npx tsc --noEmit`, `npm run lint` y `npm run build`.

Para contar las peticiones, se usan el registro del servidor de desarrollo (`POST /api/talk`, `POST /api/tts`) y la cabecera `X-Audio-Source` de [contracts/tts.md](./contracts/tts.md), visible en la pestaña de red del navegador.

## Prerrequisitos

- Supabase local corriendo (`npm run db:start`), **nunca** `db:reset`.
- `npm run dev`, y sesión iniciada con la cuenta del dueño.
- Guardar los conteos por tabla, solo de lectura.
- Antes del escenario 2, anotar cuántos archivos y cuánto espacio hay en `~/Library/Caches/english-code/tts/`.

## Escenario 1: Talk espera al botón (Historia 1)

1. Abrir Talk with AI con tus palabras. Esperado: las palabras que se usarán, `Ready for a new topic?`, el botón **Start a new topic** y la barra para responder deshabilitada. Ningún `POST /api/talk` ni `POST /api/tts` en el registro (SC-001).
2. Recargar la página dos veces y salir por el menú. Esperado: sigue sin ninguna de esas peticiones.
3. Volver y pulsar **Start a new topic**. Esperado: 1 `POST /api/talk` y 1 `POST /api/tts`, y la conversación empieza como hoy (SC-002).
4. Recargar y pulsar el botón dos veces seguidas muy rápido. Esperado: un solo `POST /api/talk` (FR-004).
5. Responder una vez y recargar. Esperado: el aviso del navegador de 005; al aceptar, la pantalla de inicio, sin retomar la conversación (FR-005).
6. Abrir **Bring any topic**. Esperado: igual que hoy, sin peticiones al entrar (FR-006).
7. Con una conversación empezada, pulsar **New topic** en el encabezado. Esperado: un tema nuevo, como hoy (FR-007).

## Escenario 2: Audio reutilizado (Historia 2)

1. En Shadowing, escuchar una palabra, fallar dos intentos, pulsar **Listen again** y la opción más lenta. Esperado: el registro muestra peticiones a `/api/tts` para esa palabra, pero solo la primera tiene `X-Audio-Source: generated`; las demás, `saved` (SC-003).
2. En una lección, reproducir el diálogo de Listening dos veces. Esperado: en la segunda, todas las respuestas con `saved` (SC-004).
3. Repetir una palabra de Immersion, una regla de Explanation, un mensaje de Talk y la pronunciación de una palabra guardada. Esperado: `saved` desde la segunda vez.
4. Comprobar que el audio repetido suena igual que el primero, y que empieza a sonar en menos de medio segundo (FR-013, SC-005).
5. Reiniciar el servidor y repetir el paso 2. Esperado: todo con `saved` (SC-007).

## Escenario 3: Casos límite (Claude)

1. Con una prueba temporal del módulo, fuera de la app: un audio guardado vacío se borra y se vuelve a pedir.
2. Con una carpeta temporal y un límite bajo: al superarlo, se borran primero los de último uso más antiguo, hasta el 90 %.
3. Dos peticiones iguales a la vez generan una sola llamada al proveedor.
4. Sin sesión, la ruta responde 401, aunque el audio esté guardado.
5. `git status` no muestra archivos de audio en el repositorio.

## Escenario 4: Todo sigue igual

1. Recorrer Talk, Shadowing y una lección. Esperado: igual que antes, salvo el botón de inicio de Talk (SC-006).
2. Repetir los conteos por tabla. Esperado: solo cambian por uso real, como conversaciones de Talk empezadas con el botón (FR-015).
