# Contrato: Writing Assistant

## `POST /api/writing-assistant`

Revisa una vez el texto recibido (FR-007). El cliente la llama con `postJson`, nunca con `fetch` directo. Gasta créditos solo si la petición pasa la guarda y las validaciones.

### Petición

```json
{ "text": "I am agree with this change.", "level": "B1" }
```

| Campo | Requerido | Regla | Si no se cumple |
|---|---|---|---|
| `text` | Sí | Texto no vacío tras recortar espacios, de hasta 5000 caracteres | 400 `invalid_request` o 413 `too_large` |
| `level` | No | `A2`, `B1`, `B2` o `C1` | 400 `invalid_request` |

### Respuestas correctas (200)

```json
{ "status": "improved", "recommendation": "I agree with this change." }
```

```json
{ "status": "natural" }
```

```json
{ "status": "not_english" }
```

La recomendación debe conservar lo que quiso decir el estudiante, sin agregar información (FR-009), y corregir también los errores de escritura. Es opcional: si el texto ya está bien, el prompt exige responder `natural`, sin proponer cambios de simple preferencia de estilo (FR-010).

### Errores

Se comprueban en este orden. Ninguno llama al proveedor, salvo el último.

| Estado | `code` | Cuándo | Origen |
|---|---|---|---|
| 401 | `session_expired` | Sin sesión, o con sesión vencida o inventada | `guardRequest` |
| 503 | `session_unverified` | No se pudo comprobar la sesión | `guardRequest` |
| 413 | `too_large` | Cuerpo de más de 32 KB, o texto de más de 5000 caracteres | `guardRequest` o `exceedsLength` |
| 400 | `invalid_request` | Cuerpo inválido, o campos que no cumplen las reglas | `guardRequest` o la ruta |
| 503 | | Falta `ANTHROPIC_API_KEY` | La ruta |
| 500 | | Falla el proveedor, o su respuesta no es válida | La ruta |

La respuesta de error nunca incluye detalles del proveedor (FR-025); esos van solo al registro del servidor.

**Respuesta inválida**: se responde 500 si el proveedor no usa la herramienta, si `status` no es uno de los tres valores, o si `improved` llega sin recomendación. Si la recomendación es idéntica al texto, se responde `natural`. Nunca se presenta un fallo como "no hay nada que mejorar".

## `lib/spelling/`

Sin red y sin créditos (FR-023).

```ts
// checker.ts
loadChecker(): Promise<SpellChecker>     // Carga nspell y los diccionarios una sola vez

interface SpellChecker {
  findMisspellings(text: string, caret: number | null): MisspelledWord[]
  suggest(word: string): string[]        // Hasta 5, de más a menos probable
}

interface MisspelledWord { start: number; end: number; word: string }
```

Si los diccionarios no cargan, no se marca ninguna palabra, se muestra un aviso, y el inspector sigue disponible.

## Textos de la interfaz

| Elemento | Texto |
|---|---|
| Menú | `Tools` · `Writing and more` |
| Encabezado de la sección | `Tools` |
| Tarjeta | `Writing Assistant` · `Open Writing Assistant →` |
| Cuadro de texto | `Write or paste your text in English…` |
| Botón del inspector | `Check sentence meaning`, y `Checking…` mientras revisa |
| Sin cambios, una oración | `This sentence looks good.` |
| Sin cambios, varias oraciones | `This paragraph looks good.` |
| Otro idioma | `Writing Assistant only reviews English.` |
| Botón de copiar | `Copy recommendation`, y `Copied` al confirmar |
| Si no se puede copiar | `Could not copy. Select the text and copy it manually.` |
| Recomendación obsoleta | `This recommendation is for an earlier version of your text.` |
| Corregir todas | `Fix all` |
| Deshacer | `Undo` |
| Sin opciones | `No suggestions` |
| Texto demasiado largo | `This text is too long. Please shorten it and try again.` |
| Fallo del inspector | `Your text could not be reviewed. Please try again.` |
| Sin conexión | `Could not reach the server. Check your connection and try again.` |
| Diccionario no disponible | `The spell checker is not available right now. You can still check the sentence meaning.` |
