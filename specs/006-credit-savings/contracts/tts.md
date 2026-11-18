# Contrato: `POST /api/tts` con reutilización de audio

La petición y las respuestas no cambian para los componentes; solo cambia de dónde sale el audio.

## Petición

Sin cambios: `{ text: string, speaker: 'male' | 'female' }`, con la sesión en `Authorization: Bearer`, mediante `postJson`.

## Respuestas

| Caso | Estado | Cuerpo | Llama a ElevenLabs |
|---|---|---|---|
| Audio guardado | 200 | `audio/mpeg` | No |
| Audio nuevo | 200 | `audio/mpeg` | Sí, una vez; se guarda |
| Petición igual en curso | 200 | `audio/mpeg` | No; usa el resultado de la otra |
| Sin sesión, sesión vencida, cuerpo inválido o texto demasiado largo | 401, 503, 400 o 413 | Los errores de 003 | No |
| Falla ElevenLabs | 500 | `{ error: 'The audio could not be generated. Please try again.' }` | Sí, sin guardar |

Las respuestas 200 llevan la cabecera `X-Audio-Source`: `generated` en la petición que llamó a ElevenLabs, y `saved` en las que no lo llamaron, incluidas las que esperaron a una petición igual en curso. Sirve para comprobar SC-003, SC-004 y SC-007 en la pestaña de red del navegador, y no contiene ningún dato privado.

## `lib/tts-cache.ts`

Módulo del servidor que usa solo la ruta.

| Función | Descripción |
|---|---|
| `audioKey(parts)` | Resumen SHA-256 de voz, modelo, ajustes y texto normalizado |
| `readSavedAudio(key)` | Devuelve el audio guardado y actualiza su último uso, o `null` si no existe, está vacío o no se puede leer, borrándolo en esos dos últimos casos |
| `saveAudio(key, audio)` | Escribe en un temporal, lo renombra y recorta la carpeta si supera el límite. Un fallo al escribir no lanza error |

Constantes: carpeta `~/Library/Caches/english-code/tts/` (temporal del sistema fuera de macOS), límite 200 MB, recorte hasta el 90 %.

## Talk with AI: textos de la interfaz

| Lugar | Texto |
|---|---|
| Categoría de la tarjeta, esperando inicio | `New conversation` |
| Título de la tarjeta, esperando inicio | `Ready for a new topic?` |
| Descripción, esperando inicio | `Start when you are ready. Every topic is different from your conversation history.` |
| Botón | `Start a new topic` |
| Etiqueta de la barra, esperando inicio | `Start a new topic to begin` |
