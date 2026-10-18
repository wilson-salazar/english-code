# Contrato: `POST /api/shadow/generate`

Única puerta de servidor para generar una oración y un tema de práctica de Shadow (Principio II: la llave
de Anthropic nunca sale del servidor). Sigue el mismo patrón que `app/api/talk/route.ts` usa para generar
temas de conversación.

## Solicitud

```json
{
  "level": "B1",
  "recentSentences": [
    "People need to get sunlight to produce vitamin D in their body.",
    "Black box testing techniques actually include several types of tests."
  ]
}
```

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `level` | string | sí | Código de nivel CEFR del estudiante (A2–C1), mismo valor que ya usa `/api/talk` |
| `recentSentences` | string[] | no | Oraciones/temas usados recientemente por este estudiante, para no repetir (equivalente a `previousTopics` en Talk with AI) |

## Respuesta — 200 OK

```json
{
  "sentence": "Black box testing techniques actually include several types of tests.",
  "topic_category": "technology"
}
```

| Campo | Tipo | Notas |
|---|---|---|
| `sentence` | string | Oración corta completa en inglés (aprox. 6–14 palabras), acorde al nivel solicitado (FR-001) |
| `topic_category` | string | Categoría/tema libre (p. ej. "technology", "psychology", "health"), igual de variado que en Talk with AI |

## Respuesta — error

Mismo formato de error ya usado por las demás rutas de IA del proyecto (`app/api/talk`,
`app/api/evaluate-speech`): código HTTP de error + `{ "error": "<mensaje>" }`. El cliente debe mostrar un
mensaje de reintento en vez de bloquear el flujo (caso límite del spec: "¿qué pasa si la generación de la
oración falla o tarda demasiado?").

## Garantías

- La oración devuelta nunca coincide textualmente con ninguna de `recentSentences` (FR-001, SC-002).
- La ruta no acepta ni expone `ANTHROPIC_API_KEY` en el cuerpo de la solicitud/respuesta.
