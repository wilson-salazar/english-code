# Contrato: `POST /api/talk` (y uso de `/api/tts`)

Única puerta de servidor para la IA de Talk with AI (Principio II: la llave de Anthropic nunca sale del servidor). Una sola ruta con tres acciones, según el campo `action`. Describe el comportamiento **actual** de `app/api/talk/route.ts`.

## Solicitud (común)

```json
{
  "action": "start" | "respond" | "feedback",
  "mode": "vocabulary" | "open",
  "vocabulary": ["term one", "term two"],
  "previousTopics": ["Topic title"],
  "history": [{ "role": "assistant", "content": "..." }, { "role": "user", "content": "..." }],
  "level": "B1"
}
```

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `action` | string | sí | Cualquier otro valor responde 400 `Unsupported action.` |
| `mode` | `vocabulary` \| `open` | no | Solo lo usa `respond`. Cualquier valor distinto de `open` se trata como `vocabulary` |
| `vocabulary` | string[] | no | Palabras guardadas del estudiante. Se recortan, se descartan las vacías y se usan como máximo 10. **Se ignoran en modo `open`** |
| `previousTopics` | string[] | no | Solo `start`. Se usan los últimos 80 títulos |
| `history` | `{role, content}[]` | `respond` y `feedback` | Se aceptan solo `assistant` y `user` con contenido; se toman los **últimos 20**, cada uno recortado a 5000 caracteres |
| `level` | string | no | Nivel CEFR; `B1` por defecto, recortado a 10 caracteres |

## Acción `start` — abrir una conversación (modo vocabulario)

Genera un tema que no esté en `previousTopics` y el primer turno de la IA.

**Respuesta 200**:

```json
{
  "topic_title": "short unique title",
  "topic_category": "one broad category",
  "message": "opening conversational turn",
  "words_used": ["saved terms actually used"]
}
```

El servidor rechaza (500) una respuesta sin título, categoría o mensaje. El cliente guarda la conversación y, si la base devuelve un conflicto por título repetido, vuelve a llamar una vez más.

## Acción `respond` — siguiente turno

Requiere que el último elemento de `history` sea del estudiante; si no, **400** `A user message is required.`

**Respuesta 200**:

```json
{ "message": "next turn from the AI", "words_used": ["saved terms actually used"] }
```

- Modo `vocabulary`: continúa el tema y debe terminar con una pregunta directa.
- Modo `open`: responde a lo que planteó el estudiante, sin cambiar de tema; la pregunta es opcional (ver D2 en `plan.md`).
- Reintenta una vez si el modelo falla. Si la respuesta no es JSON válido, usa el texto crudo como `message`.

## Acción `feedback` — retroalimentación y cierre

Requiere al menos un mensaje del estudiante; si no, **400** `At least one user response is required for feedback.`

**Respuesta 200**:

```json
{
  "message": "short encouraging closing sentence",
  "feedback": {
    "summary": "one-sentence overall assessment",
    "strengths": ["...", "..."],
    "improvements": ["...", "..."],
    "next_step": "one practical suggestion"
  }
}
```

Se rechaza (500) una respuesta sin resumen, sin fortalezas, sin mejoras o sin siguiente paso.

## Errores (todas las acciones)

| Estado | Cuerpo | Cuándo |
|---|---|---|
| 503 | `{ "error": "Talk with AI requires ANTHROPIC_API_KEY in .env.local." }` | Falta la llave en el servidor |
| 400 | `{ "error": "..." }` | Acción no soportada o historial inválido (arriba) |
| 500 | `{ "error": "The conversation could not be generated. Please try again." }` | Fallo del modelo o respuesta inválida |

El cliente debe mostrar el mensaje y **conservar la respuesta del estudiante** para reintentar (FR-015).

## Garantías

- La ruta no acepta ni expone `ANTHROPIC_API_KEY` en el cuerpo de la solicitud ni de la respuesta.
- El modo `open` nunca envía vocabulario guardado al modelo (FR-008).
- La IA responde solo en inglés (instrucción del prompt; no se verifica en el servidor).

## Dependencia: `POST /api/tts` (ruta compartida)

Talk la usa para todo el audio, con `{ "text": "...", "speaker": "female" }` y espera `audio/mpeg`.

- **Mensajes de la IA**: el texto completo del mensaje.
- **Palabras guardadas y título del tema**: textos cortos de una palabra o pocas palabras.
- El cliente corta la reproducción a los 45 segundos y, si la petición o el audio fallan, escribe el texto sin sonido (FR-014).
- El contrato propio de `/api/tts` pertenece a esa ruta, no a este módulo. En esta rama la ruta deja que ElevenLabs adivine el idioma, lo que explica la discrepancia D3 del plan.
