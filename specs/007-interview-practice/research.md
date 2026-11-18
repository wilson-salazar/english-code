# Investigación: Módulo Interview

Decisiones tomadas tras leer el código actual, la guía de Next.js 16.2.7 en `node_modules/next/dist/docs/` y la referencia de la API de Claude.

## 1. Cómo se lee el texto del PDF

**Decisión**: con la librería `unpdf` 2.1.0 en una ruta del servidor, `POST /api/interview/cv-text`. El PDF llega en base64, se lee en memoria y no se guarda en ningún sitio. La ruta devuelve solo el texto.

**Por qué**:
- **Rapidez**: leer el texto es local e inmediato, así que cumple SC-001 (menos de 10 segundos) con margen. Transcribir con la IA implica generar todo el CV como salida: unos 5.000 tokens para un CV de 20.000 caracteres, que con Claude Haiku 4.5 tardan decenas de segundos.
- **Fidelidad**: la librería devuelve el texto tal cual está en el PDF. La IA podría resumir o reformular. El estudiante revisa el texto en los dos casos, pero así hay menos que corregir.
- **Sin gasto ni salida de datos extra**: leer el CV no gasta créditos, y el PDF completo, con su diseño y datos de contacto, no sale del Mac. Solo sale el texto que el estudiante revisó y guardó, al empezar cada entrevista.
- **Lo que no cubre**: un PDF escaneado, que solo tiene imágenes, no tiene texto que leer. La spec ya lo rechaza con un mensaje claro.

**Sobre `unpdf`**: licencia MIT, sin dependencias, y está hecha para usar pdf.js en servidores. La versión 2.1.0 es del 2026-10-30; las 2.2.x tienen menos de una semana. Exige Node 24 o superior, y el equipo usa Node 24.3.0. Ocupa unos 3,2 MB en `node_modules` y no llega al navegador, porque solo la usa una ruta del servidor.

**Descartado**:
- **Bloque `document` de la API de Claude** con el PDF en base64 (admitido por Claude Haiku 4.5, hasta 32 MB por petición y 100 páginas por su contexto de 200.000 tokens): más lento, gasta créditos y envía el PDF entero. Sería la opción si hiciera falta leer PDF escaneados.
- **`pdf-parse` 2.4.5**: unos 21 MB instalados, siete veces más que `unpdf`, y su última versión es de hace un año.
- **Leer el PDF en el navegador con `pdfjs-dist`**: suma más de 1 MB al paquete del cliente y obliga a configurar un *worker*.
- **Escribir un lector de PDF propio**: el formato es complejo (fuentes, compresión, codificaciones) y no compensa.

## 2. Dónde se guardan el CV y las entrevistas

**Decisión**: una migración nueva, `supabase/migrations/20261118000000_add_interview_practice.sql`, con tres tablas: `interview_cvs`, `interviews` e `interview_turns`. Todas tienen RLS limitada al dueño, con la misma política que `shadow_sessions` y `ai_conversations` (por `users.auth_user_id = auth.uid()`). Se aplica con `psql -v ON_ERROR_STOP=1 -f`, después de un `pg_dump` verificado y nunca con `db:reset` (Principio III).

**Por qué**:
- El CV es un dato del estudiante que debe durar, y la spec pide historial de entrevistas para variarlas (FR-015, FR-020).
- Separar los turnos de la entrevista permite guardarlos a medida que ocurren, como hace Talk con `ai_conversation_messages`. Así, si se recarga a media entrevista, lo respondido no se pierde del historial.
- Restricciones de la base que refuerzan la spec: el CV entre 1 y 20.000 caracteres, un CV por usuario (`unique (user_id)`), `status` solo `in_progress` o `finished`, y `role` solo `recruiter` o `candidate`.

**Descartado**: reutilizar `ai_conversations`. Mezclaría dos módulos con reglas distintas (tipos de pregunta, enfoque, retroalimentación con respuestas mejoradas) y complicaría las consultas de Talk.

## 3. Quién escribe en la base

**Decisión**: el cliente, con la sesión del estudiante y RLS, como hacen hoy Talk y Shadowing. Las rutas del servidor solo llaman a la IA y leen el PDF.

**Por qué**: es el patrón del proyecto. RLS garantiza que solo el dueño lee y escribe sus filas (SC-007), y las rutas no necesitan credenciales de servicio, que nunca deben llegar al cliente (Principio II).

## 4. La ruta de la entrevista

**Decisión**: `POST /api/interview`, con tres modos, como `/api/talk`:

| Modo | Entrada | Salida |
|---|---|---|
| `start` | Nivel, texto del CV y enfoques recientes | Enfoque elegido, saludo con la primera pregunta y su tipo |
| `next` | Nivel, CV, enfoque e historial | Reacción a la respuesta y la siguiente pregunta, o el cierre tras la sexta |
| `feedback` | Nivel, enfoque e historial | Fortalezas, qué mejorar, siguiente paso y 2 o 3 respuestas mejoradas |

- Empieza por `guardRequest` (003). Límites: cuerpo de 128 KB, CV de 20.000 caracteres, cada mensaje de 5.000, historial de 20 turnos (12 de una entrevista completa, más las respuestas repetidas por no estar en inglés) y 10 enfoques recientes de 200 caracteres.
- El modelo es `claude-haiku-4-5-20251001`, el mismo que usan las demás rutas del proyecto. Cambiar el modelo de toda la aplicación sigue siendo una decisión pendiente del dueño.
- Cada modo usa una herramienta forzada con su esquema, como `/api/writing-assistant`, para recibir siempre JSON válido. Claude Haiku 4.5 admite `tool_choice` forzado.
- El prompt trata el CV como datos, no como instrucciones, porque un PDF podría contener texto que intente cambiar el comportamiento de la reclutadora.
- El cliente envía el CV con el que empezó la entrevista en cada turno. Así, reemplazar el CV a media entrevista no la afecta (caso límite de la spec).

## 5. Variedad de las entrevistas (FR-015, SC-004)

**Decisión**: al empezar, el cliente envía los enfoques de las 5 entrevistas más recientes (`interviews.focus_title`). La IA elige un enfoque distinto del CV, con un proyecto, un rol o una habilidad, y una mezcla de al menos tres tipos de pregunta de FR-014. Es el mismo mecanismo con el que `/api/talk` evita sus temas recientes.

## 6. La pantalla

**Decisión**:
- **Menú**: nueva sección `interview`, "Interview" con la descripción "Practice with a recruiter", entre Talk with AI y Shadowing, en `components/navigation/sections.ts`. El prefijo `/interview` resalta esa sección (005).
- **Sección del dashboard**: una tarjeta con el estado del CV (sin CV, o la fecha de su última actualización) y dos botones: **Upload your CV** o **Review your CV**, que llevan a `/interview/cv`, y **Start an interview**, que lleva a `/interview` y se deshabilita si no hay CV.
- **`/interview/cv`**: subir el PDF, revisar y corregir el texto en un cuadro con contador de caracteres, y guardar. Con un CV guardado, el cuadro empieza con su texto, y se puede reemplazar subiendo otro PDF.
- **`/interview`**: la pantalla de la entrevista, con el flujo de Talk: botón para empezar (006), mensajes de la reclutadora con voz y texto, respuesta por voz o por escrito en un cuadro editable, el avance "Question N of 6", **Finish & feedback** y la tarjeta de retroalimentación.
- **Rutas de migas**: `Interview › Your CV` e `Interview › Practice`.
- **Trabajo sin guardar (005)**: en el CV, un texto distinto del guardado; en la entrevista, grabando, con texto sin enviar, enviando, o con al menos una respuesta y sin retroalimentación.

## 7. Voz y reconocimiento de voz

**Decisión**: la reclutadora usa `speaker: 'female'` (Jessa) por `/api/tts`, con el audio reutilizado de 006. El reconocimiento de voz y la reproducción siguen los patrones de `app/(app)/talk/page.tsx`, copiados en `components/interview/InterviewSession.tsx`.

**Por qué no extraerlos de Talk ahora**: extraer un gancho común obligaría a reescribir Talk, que acaba de verificarse en 005 y 006, para un segundo uso. Se anota como posible limpieza cuando haya un tercer módulo con voz.

## 8. Otros detalles comprobados

- **Límite del cuerpo para el PDF**: 5 MB en base64 son unos 6,7 MB, así que `guardRequest` usa un máximo de 7 MB en `/api/interview/cv-text`, y la ruta comprueba además el tamaño decodificado y la firma `%PDF`.
- **PDF con contraseña**: `unpdf` lanza un error que la ruta convierte en un mensaje claro.
- **Entorno**: las dos rutas usan el entorno `nodejs`, el predeterminado según la guía, que `unpdf` necesita.
- **Variables de entorno**: no hay nuevas. La ruta de la entrevista usa `ANTHROPIC_API_KEY`, como las demás.
