# Guía de validación: Módulo Interview

Pasos para comprobar la spec ([spec.md](./spec.md)). No sustituye al Principio VI: `npx tsc --noEmit`, `npm run lint` y `npm run build`, obligatorio porque hay rutas, una dependencia y una migración nuevas.

## Estado de la verificación (2026-11-18)

| Escenario | Estado | Quién | Lo comprobado |
|---|---|---|---|
| 1. Migración | Verificado | Claude | Copia `pg_dump` verificada, conteos iguales, RLS y una política por tabla, y sin sesión las tres tablas devuelven `[]` (T002, T006, T007) |
| 2. Cargar el CV | Verificado | Dueño y Claude | Con muestras: un CV de 3 páginas en 81 ms, y escaneado, con contraseña, no PDF y más de 5 MB rechazados. El dueño guardó su CV (6.568 caracteres) (T010, T016) |
| 3. La entrevista | Verificado | Dueño, con la base revisada por Claude | 4 entrevistas con enfoques distintos; la completa usó 5 tipos de pregunta. Una entrevista terminada tras 2 respuestas solo usó un tipo (T022, T024, T025) |
| 4. Retroalimentación | Verificado | Dueño, con la base revisada por Claude | Guardada tras 6 respuestas y tras 2 (T029) |
| 5. Protección y errores | Parcial | Claude y dueño | 401 sin sesión y con token inventado en las dos rutas. El aviso al recargar sale desde la primera pregunta, tras corregirlo. Sin probar: el 413 con sesión y la sesión vencida (T034, T036) |
| 6. Todo sigue igual | Verificado | Dueño y Claude | Según el dueño; las tablas existentes no cambiaron salvo por 3 palabras guardadas (T037) |

## Prerrequisitos

- Supabase local corriendo (`npm run db:start`), **nunca** `db:reset`.
- Copia `pg_dump` verificada en `~/Backups/english-code/` antes de aplicar la migración, y conteos por tabla antes y después.
- `npm run dev`, y sesión iniciada con la cuenta del dueño.
- Un CV en PDF con texto, de 1 a 3 páginas, y para los casos límite: un PDF escaneado, uno con contraseña y un archivo que no sea PDF.

## Escenario 1: Migración (Claude)

1. Aplicar la migración con `psql -v ON_ERROR_STOP=1 -f`. Esperado: sin errores, y los conteos de las tablas existentes iguales.
2. Comprobar que las tres tablas tienen RLS activa y una política cada una.
3. Con una sesión anónima o sin sesión, consultar las tres tablas por la API de Supabase. Esperado: ninguna fila (SC-007).

## Escenario 2: Cargar el CV (Historia 1)

1. Abrir Interview sin CV. Esperado: la tarjeta pide subirlo, y **Start an interview** está deshabilitado.
2. Subir el CV en PDF. Esperado: el texto aparece en menos de 10 segundos, con todas sus secciones (SC-001).
3. Borrar el teléfono, guardar, salir y volver. Esperado: el texto guardado, sin el teléfono, y la fecha de actualización.
4. Reemplazarlo con otro PDF y guardar. Esperado: un solo CV, el nuevo.
5. Subir un archivo que no es PDF, uno con contraseña y uno escaneado. Esperado: un mensaje claro en cada caso, y el CV guardado no cambia.
6. Pegar un texto de más de 20.000 caracteres. Esperado: un aviso, y no se guarda.
7. Con cambios sin guardar, pulsar otra sección del menú. Esperado: la pregunta de 005.

## Escenario 3: La entrevista (Historias 2 y 3)

1. Abrir la entrevista, recargar y salir sin pulsar el botón. Esperado: ninguna llamada a `/api/interview` ni audio (SC-002).
2. Pulsar **Start an interview**. Esperado: la reclutadora saluda y hace la primera pregunta en inglés, con voz y texto, y aparece `Question 1 of 6`.
3. Responder por voz, corregir el texto y enviar. Esperado: una reacción natural y la siguiente pregunta en menos de 5 segundos (SC-003).
4. Responder una vez en español. Esperado: pide responder en inglés y el avance no cambia.
5. Responder las 6 preguntas. Esperado: preguntas sobre lo que dice el CV, de al menos tres tipos distintos (SC-005).
6. Repetir 3 entrevistas más con el mismo CV. Esperado: cada una con un enfoque distinto (SC-004).

## Escenario 4: Retroalimentación (Historia 4)

1. Al terminar las 6 preguntas. Esperado: fortalezas, qué mejorar, siguiente paso y 2 o 3 respuestas mejoradas junto a lo que dijiste.
2. En otra entrevista, pulsar **Finish & feedback** tras 2 respuestas. Esperado: la retroalimentación con lo respondido.

## Escenario 5: Protección y errores

1. Sin token y con un token inventado, `POST /api/interview` y `POST /api/interview/cv-text`. Esperado: 401.
2. Un cuerpo por encima del límite. Esperado: 413.
3. A media entrevista, recargar. Esperado: el aviso del navegador; al volver, el botón de inicio, y la entrevista anterior en el historial.
4. Simular sesión vencida (quickstart de 003, escenario 3) y enviar una respuesta. Esperado: el aviso de sesión y el texto intacto (SC-006).

## Escenario 6: Todo sigue igual

1. Recorrer Talk, Shadowing y una lección. Esperado: igual que antes.
2. Repetir los conteos. Esperado: las tablas existentes, iguales salvo por uso real; las nuevas, con el CV y las entrevistas de las pruebas.
