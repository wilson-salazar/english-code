# Investigación: Ahorro de créditos de IA y audio

Decisiones tomadas tras leer el código actual y la guía de Next.js 16.2.7 en `node_modules/next/dist/docs/`.

## 1. Dónde se reutiliza el audio

**Decisión**: en la ruta del servidor `app/api/tts/route.ts`, con archivos en el disco del Mac. Antes de llamar a ElevenLabs, la ruta busca un archivo para la misma petición; si existe, lo devuelve; si no, llama al proveedor y guarda el resultado.

**Por qué**:
- Los 8 componentes que piden audio pasan todos por `/api/tts` (Principio II). Un solo cambio cubre a todos, como pide FR-009, sin tocar cada componente.
- Los archivos sobreviven a recargas y reinicios, como pide FR-008 por decisión del dueño.
- La ruta sigue empezando por `guardRequest`, así que sin sesión no se entrega audio, ni siquiera el guardado (003).
- Según la guía (`route-segment-config/index.md`), las rutas usan por defecto el entorno `nodejs`, con acceso al sistema de archivos.

**Descartado**:
- Guardar en el navegador (memoria o IndexedDB): habría que tocar los 8 componentes, y los datos del navegador se pueden borrar sin aviso.
- Guardar en la base de datos: el audio no es dato del estudiante, y hay que mantener la base sin cambios de esquema (FR-015).
- La cabecera `Cache-Control` que ya devuelve la ruta: los navegadores no guardan respuestas de un `POST`, así que hoy no sirve de nada.

## 2. Qué identifica a un audio

**Decisión**: un resumen SHA-256 de la voz, el modelo, los ajustes de voz y el texto normalizado. El texto se normaliza quitando espacios al inicio y al final y reduciendo los espacios seguidos a uno. Mayúsculas y puntuación no se tocan.

**Por qué**:
- La voz, el modelo y los ajustes cambian el sonido; la ruta ya elige otro modelo para textos de hasta 5 palabras (`SHORT_TEXT_MAX_WORDS`). Si se cambian en el código, el resumen cambia y no se reutiliza un audio viejo con otra configuración (FR-013).
- Los espacios no cambian lo que se dice (caso límite de la spec). Las mayúsculas y la puntuación pueden cambiar la entonación.
- El nombre del archivo es el resumen: tiene longitud fija y no expone el texto.

## 3. Dónde se guardan los archivos

**Decisión**: en `~/Library/Caches/english-code/tts/` en macOS, y en la carpeta temporal del sistema en otros sistemas.

**Por qué**: el repositorio está dentro de iCloud Drive, y una carpeta ahí se sincronizaría con iCloud. `~/Library/Caches` es la carpeta de macOS para datos que se pueden regenerar, y no se sincroniza con iCloud. Además, así el audio no entra al repositorio público. Si macOS la vacía, los audios se vuelven a pedir, sin ningún error.

**Privacidad**: los audios de Talk contienen mensajes de la IA sobre los temas del dueño, y quedan en su propio Mac, igual que el resto de sus datos locales (Principio IV).

## 4. Límite de espacio (FR-012)

**Decisión**: 200 MB. Al guardar un audio nuevo, si la carpeta supera el límite, se borran los archivos usados hace más tiempo hasta bajar al 90 %. Cada vez que se reutiliza un archivo, se actualiza su fecha de modificación, que marca el último uso.

**Por qué**: el contenido de las 90 fases de escenarios y las 15 de capítulos suma unos 74.000 caracteres, contando el JSON completo. Con el formato que devuelve ElevenLabs, a velocidad 0,8, es como mucho unos 100 MB aunque se escuchara todo. 200 MB cubre todas las lecciones y deja sitio para Talk y Shadowing. Bajar al 90 % evita revisar la carpeta en cada audio nuevo.

## 5. Archivos dañados y peticiones simultáneas (FR-011)

**Decisión**:
- Un archivo vacío o que no se puede leer se borra, y la ruta pide el audio de nuevo sin mostrar un error.
- Se escribe primero en un archivo temporal y luego se renombra, para que una lectura nunca encuentre un audio a medio escribir.
- Si llegan dos peticiones iguales a la vez, la segunda espera el resultado de la primera, con un registro en memoria de las peticiones en curso. Así se pide al proveedor una sola vez (SC-003).
- Si falla el guardado en disco, el audio se devuelve igual, sin guardarlo.
- Si falla el proveedor, no se guarda nada y la respuesta es la misma de hoy.

## 6. Talk with AI: esperar al botón (FR-001 a FR-007)

**Hallazgo**: `initializeTalk`, en `app/(app)/talk/page.tsx`, llama a `startConversation` al entrar en el modo con palabras guardadas. `startConversation` pide el tema a `/api/talk` y luego el audio del primer mensaje. El modo abierto llama a `startOpenConversation`, que no pide nada al servidor.

**Decisión**:
- `initializeTalk` carga el perfil y las palabras, pero ya no llama a `startConversation`, y deja `loadingTopic` en falso.
- Mientras no hay tema (`!isOpenMode && !topicTitle && !loadingTopic`), la tarjeta del tema muestra el texto de inicio y el botón **Start a new topic**, que llama a `handleNewTopic`, la misma función del botón **New topic** del encabezado.
- En ese estado, la barra para responder queda deshabilitada y su etiqueta dice que hay que empezar un tema.
- `handleNewTopic` usa un `ref` para ignorar una segunda pulsación antes de que `loadingTopic` cambie. Hoy espera a `loadActiveTerms` antes de marcar la carga, así que dos clics rápidos podrían crear dos temas (FR-004).
- Al recargar con una conversación a medias, la pantalla vuelve al inicio sin retomar nada (FR-005). La conversación ya está guardada en `ai_conversations`, y la confirmación de 005 avisa antes de recargar.

**Por qué**: es el cambio mínimo. El flujo tras pulsar el botón es el mismo de hoy, así que se conserva todo lo de la spec 002.

## 7. Otros detalles comprobados

- La traducción de palabras sin significado (`/api/vocabulary/translate`) se pide una vez por palabra y se guarda en la base; queda fuera del alcance.
- `ComprehensionPhase` ya guardaba en memoria el audio de cada pregunta. Con la reutilización en el servidor, esa memoria sigue siendo útil, porque evita incluso la petición al servidor.
- `.env.example` no cambia: la carpeta y el límite son constantes en el código.
