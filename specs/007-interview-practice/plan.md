# Plan de implementación: Módulo Interview

**Rama**: `007-interview-practice-plan` | **Fecha**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificación de la funcionalidad en `specs/007-interview-practice/spec.md`

## Resumen

Un módulo nuevo en el menú, Interview, con dos pantallas:

- **`/interview/cv`**: el estudiante sube su CV en PDF. Una ruta del servidor lee el texto con `unpdf`, sin guardar el archivo ni llamar a la IA. El estudiante revisa y corrige el texto, y se guarda en una tabla nueva con RLS.
- **`/interview`**: con el flujo de Talk with AI, una reclutadora con IA hace 6 preguntas basadas en el CV, con voz y texto. El estudiante responde por voz o por escrito y corrige antes de enviar. Al final recibe una retroalimentación con sus respuestas más débiles mejoradas. La entrevista empieza con un botón (006), y sus turnos se guardan en tablas nuevas para variar las siguientes.

Las decisiones están en [research.md](./research.md).

## Contexto técnico

**Lenguaje/Versión**: TypeScript sobre Next.js 16.2.7 (App Router) y React 19, el mismo stack del proyecto. Node 24.3.0.

**Dependencias principales**: una nueva, `unpdf` 2.1.0 (MIT, sin dependencias), solo en el servidor, para leer el texto del PDF ([research §1](./research.md)). La IA usa `@anthropic-ai/sdk`, ya instalado, con `claude-haiku-4-5-20251001`.

**Almacenamiento**: tres tablas nuevas con RLS, en una migración incremental ([data-model.md](./data-model.md)). El PDF no se guarda.

**Pruebas**: sin suite automatizada. Verificación manual con [quickstart.md](./quickstart.md); la lectura de PDF se prueba con archivos de muestra, sin sesión ni créditos. Más `npx tsc --noEmit`, `npm run lint` y `npm run build` (Principio VI).

**Plataforma**: solo web, con el servidor en el Mac del dueño.

**Tipo de proyecto**: aplicación web con un único paquete de Next.js.

**Objetivos de rendimiento**: texto del CV en menos de 10 segundos (SC-001); cada pregunta en menos de 5 segundos (SC-003).

**Restricciones**: `guardRequest` en las dos rutas; PDF de hasta 5 MB y CV de hasta 20.000 caracteres; ninguna llamada a la IA al entrar; nunca `db:reset`.

**Alcance**: 1 migración, 2 rutas, 2 páginas, 2 componentes, y cambios en el menú y el dashboard.

## Constitution Check

*Barrera antes de la Fase 0; revisada de nuevo tras la Fase 1.*

| Principio | Estado | Cómo se cumple |
|---|---|---|
| I. Contenido pensado para el estudiante | PASS | Entrevistas de QA y desarrollo, a partir del CV, adaptadas al nivel A2 a C1, con retroalimentación constructiva (FR-014, FR-017). No toca lecciones ni fases. |
| II. Secretos en el servidor, una sola puerta | PASS con enmienda pendiente | La IA vive solo en `app/api/interview`, y el audio pasa por `/api/tts`. La lista de rutas del Principio II debe sumar `interview`, junto con `writing-assistant` y `shadow/generate`, en la enmienda PARCHE que ya está pendiente. |
| III. Seguridad de los datos y RLS (no negociable) | PASS | Tablas nuevas en una migración nueva, con RLS limitada al dueño en las tres. Se aplica con `psql` tras un `pg_dump` verificado fuera del repositorio, con conteos antes y después. Sin `db:reset`, sin cambios en tablas existentes. |
| IV. Local-first y privado | PASS | La base sigue siendo local. El PDF se lee en el servidor del Mac y no se guarda; solo el texto revisado sale a Anthropic al entrevistar, como ya ocurre con las respuestas de las evaluaciones. El estudiante puede quitar sus datos de contacto antes de guardar. |
| V. Contratos de componentes estables | PASS | No toca las fases ni `onComplete()`. |
| VI. Verificado antes de terminar | PASS con excepciones (2026-11-18) | `tsc`, lint y build pasan; la migración se aplicó tras una copia verificada, sin cambiar las tablas existentes, y con RLS comprobada; la lectura de PDF se probó con muestras; el dueño recorrió [quickstart.md](./quickstart.md). Sin probar por separado: el 413 con sesión y la sesión vencida. |

**Restricción del stack**: `unpdf` es una dependencia de ejecución nueva, justificada en [research §1](./research.md) y en la tabla de complejidad.

**Revisión tras el diseño**: sin violaciones nuevas.

## Estructura del proyecto

### Documentación

```text
specs/007-interview-practice/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/interview.md
├── checklists/requirements.md
└── tasks.md             # Lo crea /speckit-tasks
```

### Código

```text
supabase/migrations/20261118000000_add_interview_practice.sql   # 3 tablas, índices y RLS

app/api/interview/route.ts               # start, next y feedback con la IA (FR-010 a FR-021)
app/api/interview/cv-text/route.ts       # Texto del PDF con unpdf (FR-003, FR-008)
lib/cv-text.ts                           # Lectura y normalización del texto, separada para probarla sin sesión

app/(app)/interview/page.tsx             # Monta InterviewSession
app/(app)/interview/cv/page.tsx          # Monta CvEditor

components/interview/CvEditor.tsx        # Subir, revisar y guardar el CV (Historia 1)
components/interview/InterviewSession.tsx  # La entrevista y la retroalimentación (Historias 2 a 4)

components/navigation/sections.ts        # Sección interview y prefijo /interview
app/(app)/dashboard/page.tsx             # Tarjeta con el estado del CV y los botones

package.json, package-lock.json          # unpdf 2.1.0
AGENTS.md, README.md, MANUAL_USUARIO.md
```

**Decisión de estructura**: sigue el patrón de Talk y Writing Assistant: páginas que solo montan un componente, en el grupo `(app)` para tener el menú (005), y rutas de la IA en `app/api`. La entrevista copia los patrones de voz de Talk en lugar de extraerlos, para no reescribir Talk ([research §7](./research.md)).

## Orden de implementación recomendado

1. Copia `pg_dump` verificada y conteos; escribir y aplicar la migración; comprobar RLS.
2. Instalar `unpdf`, crear `/api/interview/cv-text` y probarlo con PDF de muestra.
3. Crear la pantalla del CV y la tarjeta del dashboard, con la sección en el menú (Historia 1).
4. Crear `/api/interview` y comprobar sus rechazos.
5. Crear la pantalla de la entrevista (Historias 2 y 3).
6. Agregar la retroalimentación (Historia 4).
7. Actualizar `AGENTS.md`, `README.md` y `MANUAL_USUARIO.md`.
8. Ejecutar las barreras y [quickstart.md](./quickstart.md).

## Seguimiento de complejidad

| Elemento añadido | Por qué se necesita | Alternativa más simple descartada |
|---|---|---|
| Dependencia `unpdf` | Leer el texto de un PDF de forma rápida, fiel y sin gastar créditos | La IA con el PDF como documento: más lenta, gasta créditos y envía el PDF completo. Un lector propio: el formato es demasiado complejo |
| Tres tablas nuevas | Guardar el CV y el historial que hace variar las entrevistas (FR-015, FR-020) | Reutilizar `ai_conversations`: mezcla dos módulos con reglas distintas |
| Patrones de voz copiados de Talk | La entrevista necesita la misma voz y el mismo dictado | Extraer un gancho común: obliga a reescribir Talk, recién verificado |
