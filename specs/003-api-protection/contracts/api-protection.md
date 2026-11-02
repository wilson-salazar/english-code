# Contrato: protección de las rutas de la API

Se aplica a las 7 rutas de `app/api`. El cuerpo y la respuesta correcta de cada ruta no cambian. Esto se agrega encima.

## Petición

Toda petición lleva `Authorization: Bearer <access_token>`. Las pantallas no la escriben a mano: usan `postJson` de `lib/api.ts`.

## Orden de comprobación

1. Sesión.
2. Tamaño del cuerpo.
3. JSON válido y con forma de objeto.
4. Campos de la ruta: tipo, presencia y tamaño.
5. Llamada al proveedor. Solo aquí se gastan créditos.

Los avisos de llave sin configurar (503, ya existentes) se conservan, después del paso 1.

## Respuestas de error

Todas son JSON con `error`, que es texto en inglés apto para mostrarse, y `code`, cuando la pantalla necesita distinguir el caso.

| Estado | `code` | `error` | Cuándo |
|---|---|---|---|
| 401 | `session_expired` | `Sign in again, then retry.` | Sin sesión, sesión inválida o anónima |
| 503 | `session_unverified` | `Your session could not be verified. Please try again.` | El servicio de autenticación no responde |
| 413 | `too_large` | `This text is too long. Please shorten it and try again.` | Cuerpo o campo por encima del límite |
| 400 | `invalid_request` | `This request is not valid.` | JSON inválido, o campo ausente o de tipo incorrecto |
| 500 | — | Mensaje genérico de la ruta | Fallo del proveedor o respuesta inservible; el detalle queda solo en el registro del servidor |

Ninguna respuesta incluye texto, códigos ni identificadores del proveedor (FR-020).

## Límites por ruta

Los campos se miden en caracteres y el cuerpo en bytes. Las mediciones que los justifican están en [research.md](../research.md) §7.

| Ruta | Cuerpo máx. | Campos |
|---|---|---|
| `/api/tts` | 16 KB | `text`: obligatorio, de 1 a 3000 |
| `/api/evaluate` | 32 KB | `response`: obligatorio, hasta 5000; `prompt`: hasta 2000; `scenarioTitle`: hasta 200 |
| `/api/evaluate-speech` | 32 KB | `transcript`: obligatorio, hasta 5000; `prompt`: hasta 2000; `scenarioTitle`: hasta 200 |
| `/api/evaluate-chapter` | 32 KB | `response`: obligatorio, hasta 5000; `prompt`: hasta 2000; `chapterTitle`: hasta 200 |
| `/api/talk` | 1 MB | `vocabulary[]`: cada una hasta 120; `previousTopics[]`: cada uno hasta 200; **último mensaje del estudiante en `history`**: hasta 5000 |
| `/api/shadow/generate` | 32 KB | `recentSentences[]`: cada una hasta 500; `previousTopic`: se conserva el recorte a 120 |
| `/api/vocabulary/translate` | 16 KB | `terms[]`: cada una hasta 120 |

### Recortes que se conservan (FR-013)

- `/api/talk`: 10 palabras, 80 títulos, 20 mensajes, 5000 caracteres por mensaje anterior, nivel a 10 caracteres.
- `/api/shadow/generate`: 50 oraciones, nivel a 10 caracteres.
- `/api/vocabulary/translate`: 10 términos.

### Tipos

Los arreglos de texto se validan antes de usarlos. Hoy un valor que no es texto hace fallar `.trim()` antes del `try` de `/api/talk`; con esta validación responde 400.

## Comportamiento de `postJson`

| Respuesta | Qué hace |
|---|---|
| 2xx y otros errores | Devuelve la respuesta a la pantalla |
| 401 | Renueva la sesión y reintenta una vez; si sigue en 401, emite el evento `session_expired` y devuelve la respuesta |
| 503 con `session_unverified` | Emite el evento y devuelve la respuesta; no reintenta |

El reintento repite la misma petición solo tras un 401, cuando el proveedor aún no recibió ninguna llamada, así que no gasta créditos dos veces.

## Cómo reacciona cada pantalla

- **Evaluaciones** (3 pantallas): comprueban `res.ok`, no cambian `feedback`, no escriben en la base, muestran `error` y conservan la respuesta.
- **Talk y Shadowing**: ya muestran `error` y permiten reintentar. Además, Talk rechaza en la propia pantalla una respuesta de más de 5000 caracteres **antes de guardarla**: una respuesta ya guardada que el servidor rechaza no se podría reintentar nunca.
- **Audio**: sin cambios: siguen sin sonido y con el texto visible; el aviso global explica la causa.
- **Vocabulario**: sin cambios: la traducción queda pendiente y se reintenta más adelante.
