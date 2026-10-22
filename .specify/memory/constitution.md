# Constitución de English Code

## Principios fundamentales

### I. Contenido pensado para el estudiante
El contenido de las lecciones DEBE mantenerse alineado con la audiencia del producto: desarrolladores,
ingenieros de QA y otros profesionales de tecnología que aprenden inglés práctico de trabajo. Los
escenarios DEBEN seguir la secuencia de fases immersion → listening → comprehension → speaking →
expression (las lecciones de capítulos de gramática usan sus propios componentes de fase) y DEBEN
escribirse como datos semilla, no como texto fijo dentro de los componentes. El feedback generado por
IA DEBE ser constructivo y adecuado al nivel del estudiante (A2–C1).

Justificación: el valor del producto es la calidad y la relevancia de sus lecciones; el código que
diluye o salta la estructura del currículo debilita toda la aplicación.

### II. Secretos solo en el servidor e integraciones por una sola puerta
Los servicios de terceros DEBEN alcanzarse únicamente a través de su ruta dedicada en `app/api/*`.
El texto a voz de ElevenLabs DEBE pasar por `/api/tts` con `{ text, speaker: 'male' | 'female' }`, y
los IDs de voz DEBEN vivir solo en esa ruta. Las llamadas a Anthropic DEBEN vivir solo en rutas del
servidor (`evaluate`, `evaluate-chapter`, `evaluate-speech`, `talk`, `vocabulary/translate`).
`ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY` y cualquier llave service-role de Supabase NO DEBEN aparecer
en código del cliente ni en variables `NEXT_PUBLIC_*`. Los archivos `.env*` NO DEBEN subirse al
repositorio; solo se versiona `.env.example` con valores de ejemplo.

Justificación: una única puerta por servicio mantiene las llaves privadas, los costos controlables y el
comportamiento consistente.

### III. Seguridad de los datos y RLS (NO NEGOCIABLE)
Todos los datos del usuario (`user_progress`, `user_responses`, vocabulario personal y similares)
DEBEN estar protegidos con Row Level Security limitada a su dueño. Las bases locales que contengan
cuentas reales NO DEBEN reiniciarse ni borrarse (`npm run db:reset`, `supabase db reset`). Los cambios
de esquema y de seeds DEBEN aplicarse de forma incremental (por ejemplo,
`psql -v ON_ERROR_STOP=1 -f <archivo>.sql`). Antes de cualquier cambio riesgoso se DEBE hacer un
`pg_dump` verificado. Los seeds DEBEN ser solo inserciones aditivas, con un bloque `do $$ ... $$` por
elemento. Los cambios de esquema DEBEN entregarse como archivos nuevos en `supabase/migrations/`, que
son la fuente de verdad del esquema.

Justificación: usuarios, progreso y palabras guardadas que se destruyen no se pueden recuperar.

### IV. Local-first y privado
La aplicación NO DEBE depender de Supabase Cloud ni de ninguna base de datos administrada por un
tercero. NO DEBEN abrirse puertos del router ni exponerse PostgreSQL o la red doméstica a Internet.
El acceso remoto (por ejemplo, desde el iPhone) DEBE hacerse solo a través de una red privada
(Tailscale) con HTTPS. El Supabase alojado en la nube NO DEBE darse por vigente: el desarrollo apunta
al stack local de Supabase.

Justificación: es una aplicación de uso personal y los datos propios no deben depender de un proyecto
que se pausa o se bloquea por inactividad.

### V. Contratos de componentes estables
Los componentes de fase DEBEN recibir el contenido JSON ya parseado como props y llamar a
`onComplete()` cuando el usuario termina; cambiar este contrato DEBE ir acompañado de la actualización
correspondiente en `app/scenario/[id]/page.tsx` y `app/chapter/[id]/page.tsx`. El parseo de contenido
DEBE pasar por los helpers de `lib/content.ts`. Los comentarios en el código DEBEN limitarse a explicar
un porqué que no sea obvio.

Justificación: las páginas componen las fases de forma genérica; un cambio silencioso de contrato rompe
todas las lecciones a la vez.

### VI. Verificado antes de terminar
Como el proyecto no tiene una suite de pruebas automatizadas, todo cambio DEBE pasar
`npx tsc --noEmit` y `npm run lint` antes de considerarse terminado; `npm run build` DEBE ejecutarse
cuando el cambio toque configuración, rutas o dependencias. Los cambios de interfaz o de API DEBEN
comprobarse en la aplicación corriendo (`npm run dev` contra Supabase local). Si se introducen pruebas
automatizadas, DEBEN ejecutarse en esta misma barrera. La versión de Next.js en uso (16.x) tiene
cambios incompatibles con versiones anteriores, así que se DEBE leer la guía correspondiente en
`node_modules/next/dist/docs/` antes de escribir código a nivel de framework.

Justificación: sin pruebas automatizadas, la verificación explícita es la única protección contra
regresiones.

## Restricciones de seguridad y datos

- El repositorio es público (`github.com/wilson-salazar/english-code`) bajo la cuenta personal del
  dueño; NO DEBEN subirse llaves reales, credenciales ni material relacionado con empleadores.
- Las credenciales locales de Supabase obtenidas con `npx supabase status` son solo de desarrollo y NO
  DEBEN reutilizarse en producción ni en código del cliente, salvo la llave pública (anon/publishable).
- Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres + Auth +
  RLS), SDK de Anthropic, ElevenLabs. Agregar un servicio externo nuevo o una dependencia de runtime
  significativa requiere una justificación documentada en el plan de la funcionalidad.
- Las copias de seguridad (`pg_dump`) DEBEN guardarse fuera del repositorio y fuera de carpetas
  sincronizadas, porque contienen datos personales y hashes de contraseña.

## Flujo de desarrollo y barreras de calidad

- Las funcionalidades siguen el flujo de Spec Kit: specify → clarify (si hay ambigüedad) → plan →
  tasks → implement → converge, con esta constitución verificada en la etapa de plan (Constitution
  Check).
- Se usa una rama de git por etapa de SDD, creada desde la anterior, con un commit al final de cada
  etapa. NO DEBEN mezclarse cambios no relacionados en un mismo commit.
- Alcance de cada cambio, según su tipo:
  1. Cambio visual o de textos que no altera el comportamiento (estilos, tamaños, redacción): no
     modifica la spec; se describe en el mensaje del commit. Si el cambio renombra algo que la spec
     nombra, la spec se actualiza en el mismo commit.
  2. Cambio de comportamiento en una funcionalidad que ya tiene spec: se actualiza la spec con
     `/speckit-clarify`, se anexan tareas nuevas sin borrar las existentes (`/speckit-tasks`) y se
     implementa solo lo nuevo. No se reinicia el ciclo desde cero.
  3. Funcionalidad nueva: flujo completo de Spec Kit.
  Ante la duda sobre si un cambio altera el comportamiento, se trata como el caso 2.
- Todo conjunto de cambios DEBE indicar qué principios toca y confirmar que pasó la barrera del
  Principio VI (tipos, lint, build cuando aplique y verificación manual).
- Los cambios de base de datos DEBEN revisarse por su impacto en RLS y por su carácter destructivo antes
  de aplicarse a cualquier base con datos reales.
- Idioma: los documentos de SDD (constitución, specs, planes, tareas y checklists) se escriben en
  español; el código, los nombres de archivos e identificadores y los textos de la interfaz que ve el
  estudiante se mantienen en inglés.
- La simplicidad es la opción por defecto: se prefiere extender los componentes de fase, rutas y helpers
  existentes antes que introducir abstracciones nuevas, y se justifica en el plan cualquier complejidad
  añadida.

## Gobernanza

Esta constitución prevalece sobre otras prácticas del proyecto cuando entran en conflicto. La guía de
ejecución para asistentes de código vive en `AGENTS.md`/`CLAUDE.md` y DEBE mantenerse consistente con
ella.

- Enmiendas: se proponen editando este archivo en un cambio dedicado que incluya la justificación y,
  si afecta código o datos existentes, un plan de migración. El dueño del repositorio las aprueba.
- Versionado: semántico. MAYOR para eliminaciones o redefiniciones incompatibles de principios, MENOR
  para principios o secciones nuevas o guías ampliadas de forma material, PARCHE para aclaraciones y
  correcciones de redacción.
- Revisión de cumplimiento: los planes DEBEN incluir un Constitution Check contra los Principios I–VI,
  y las revisiones de cambios DEBEN verificar el cumplimiento; las violaciones se corrigen o se
  justifican por escrito.

**Versión**: 1.1.0 | **Ratificada**: 2026-10-17 | **Última enmienda**: 2026-10-22
