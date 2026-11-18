# Modelo de datos: Ahorro de créditos de IA y audio

Esta funcionalidad no tiene tablas ni cambios de esquema (FR-015).

## Audio guardado

Un archivo en la carpeta de audio del servidor ([research §3](./research.md)).

| Campo | Descripción | Regla |
|---|---|---|
| Nombre | Resumen SHA-256 de voz, modelo, ajustes y texto normalizado, más `.mp3` | Identifica el audio sin exponer el texto ([research §2](./research.md)) |
| Contenido | El audio MP3 tal como lo devolvió ElevenLabs | Nunca vacío; uno vacío o ilegible se borra y se vuelve a pedir |
| Último uso | La fecha de modificación del archivo | Se actualiza al crearlo y cada vez que se reutiliza |

**Límite**: 200 MB en total. Al superarlo tras guardar un audio, se borran los de último uso más antiguo hasta bajar a 180 MB (90 %).

**Normalización del texto**: quitar espacios al inicio y al final, y reducir a uno los espacios seguidos. Mayúsculas y puntuación se conservan.

### Ciclo de una petición

```text
POST /api/tts
  ├── sin sesión o entrada inválida ───────────→ rechazo de 003, sin leer ni escribir audio
  ├── archivo existe y se puede leer ─────────→ se devuelve; se actualiza su último uso
  ├── misma petición ya en curso ─────────────→ espera su resultado
  └── no existe
        ├── ElevenLabs responde ──────────────→ se guarda (temporal + renombrar), se devuelve,
        │                                       y se recorta la carpeta si supera el límite
        └── ElevenLabs falla ─────────────────→ error de hoy; no se guarda nada
```

## Pantalla de inicio de Talk

Estado derivado en `app/(app)/talk/page.tsx`, sin datos nuevos.

| Estado | Condición | Se ve |
|---|---|---|
| Esperando inicio | Modo con palabras, sin tema y sin carga en curso | Palabras que se usarán, botón **Start a new topic** y barra para responder deshabilitada |
| Preparando tema | `loadingTopic` | El indicador de hoy; los dos botones de tema deshabilitados |
| Conversación | Hay tema | Igual que hoy |

Recargar en cualquier estado vuelve a "Esperando inicio" (FR-005).
