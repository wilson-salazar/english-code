# Contrato: Módulo Interview

Las dos rutas empiezan por `guardRequest` (003) y se llaman desde el cliente con `postJson`. Sus errores de sesión y tamaño son los de 003: 401 `session_expired`, 503 `session_unverified`, 413 `too_large` y 400 `invalid_request`.

## `POST /api/interview/cv-text`

Lee el texto de un PDF. No llama a ningún proveedor ni guarda nada.

**Petición** (máximo 7 MB): `{ pdf: string }`, el PDF en base64, sin el prefijo `data:`.

| Caso | Estado | Cuerpo |
|---|---|---|
| Texto leído | 200 | `{ text: string, pages: number, tooLong: boolean }`; `tooLong` es verdadero si supera 20.000 caracteres, y el texto llega completo para que el estudiante lo recorte |
| No es PDF o pesa más de 5 MB | 400 | `{ error: 'Upload a PDF file of up to 5 MB.', code: 'invalid_pdf' }` |
| PDF con contraseña | 422 | `{ error: 'This PDF is password-protected. Remove the password and try again.', code: 'password_protected' }` |
| Sin texto legible (por ejemplo, escaneado) | 422 | `{ error: 'We could not find any text in this PDF. Export your CV as a text PDF and try again.', code: 'no_text' }` |
| Otro fallo al leer | 500 | `{ error: 'Your CV could not be read. Please try again.' }` |

El texto se normaliza: saltos de línea unificados, sin espacios al final de cada línea y con un máximo de dos líneas vacías seguidas.

## `POST /api/interview`

Llama a la IA. Petición de 128 KB como máximo.

### `mode: 'start'`

**Petición**: `{ mode: 'start', level: 'A2' | 'B1' | 'B2' | 'C1', cvText: string, recentFocuses: string[] }`; `cvText` de 1 a 20.000 caracteres, y `recentFocuses` de 0 a 10 textos de hasta 200 caracteres.

**Respuesta 200**: `{ focusTitle: string, message: string, questionType: QuestionType }`; `message` es el saludo con la primera pregunta.

### `mode: 'next'`

**Petición**: `{ mode: 'next', level, cvText, focusTitle: string, questionCount: 6, history: Turn[] }`; `history` de 1 a 20 turnos (6 preguntas y 6 respuestas, más las respuestas no aceptadas por no estar en inglés), empieza con la reclutadora y termina con una respuesta del estudiante.

**Respuesta 200**: `{ message: string, questionType: QuestionType | null, finished: boolean, answerAccepted: boolean }`. Tras la sexta respuesta aceptada, `message` cierra la entrevista, `questionType` es `null` y `finished` es verdadero. Si la respuesta no está en inglés, `answerAccepted` es falso, `message` pide en inglés responder en inglés y repite la pregunta, y el avance no cambia.

### `mode: 'feedback'`

**Petición**: `{ mode: 'feedback', level, focusTitle: string, history: Turn[] }`; con al menos una respuesta del estudiante.

**Respuesta 200**: `{ feedback: InterviewFeedback }`, que también se guarda en `interviews.feedback`.

### Tipos

```text
Turn = { role: 'recruiter' | 'candidate', content: string }   // 1 a 5000 caracteres
QuestionType = 'opening' | 'cv_experience' | 'qa_concepts' | 'automation'
             | 'situational' | 'practical' | 'closing'
InterviewFeedback = {
  strengths: string[]             // 2 a 4
  improvements: string[]          // 2 a 4
  nextStep: string
  improvedAnswers: {              // 1 a 3; las respuestas más débiles
    question: string
    original: string
    improved: string
  }[]
}
```

### Errores propios

| Caso | Estado | Cuerpo |
|---|---|---|
| Falta `ANTHROPIC_API_KEY` | 503 | `{ error: 'The interview is not available right now.' }` |
| Fallo o respuesta inválida de la IA | 500 | `{ error: 'The interview could not continue. Please try again.' }` |

## Textos de la interfaz

| Lugar | Texto |
|---|---|
| Menú | `Interview` · `Practice with a recruiter` |
| Tarjeta sin CV | `Upload your CV to start practicing.` · botón `Upload your CV` |
| Tarjeta con CV | `CV updated on <fecha>` · botones `Review your CV` y `Start an interview` |
| Pantalla del CV | Título `Your CV`; botón `Choose a PDF`; ayuda `Review the text before saving. You can remove your phone number or email.`; contador `<n> / 20,000 characters`; botón `Save CV` |
| Inicio de la entrevista | `Ready for your interview?` · `A recruiter will ask you 6 questions based on your CV.` · botón `Start an interview` |
| Sin CV en la entrevista | `Upload your CV first.` · enlace `Upload your CV` |
| Avance | `Question <n> of 6` |
| Terminar | `Finish & feedback` |
| Retroalimentación | `Strengths`, `What to improve`, `Next step`, `Stronger answers` (`You said` / `Try this`) |
| Respuesta en español | La reclutadora pide, en inglés, responder en inglés, y no cuenta como respuesta |
