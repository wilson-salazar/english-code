# Plan de implementación: Ahorro de créditos de IA y audio

**Rama**: `006-credit-savings-plan` | **Fecha**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificación de la funcionalidad en `specs/006-credit-savings/spec.md`

## Resumen

Dos cambios independientes:

- **Talk with AI espera al botón**: al entrar o recargar en el modo con palabras, `initializeTalk` ya no crea el tema. La tarjeta muestra **Start a new topic**, que usa la misma función que el botón **New topic** del encabezado, protegida contra dobles clics.
- **Audio reutilizado en el servidor**: `/api/tts` guarda cada audio generado en `~/Library/Caches/english-code/tts/`, con el nombre de un resumen de voz, modelo, ajustes y texto. Antes de llamar a ElevenLabs, busca ese archivo. La carpeta tiene un límite de 200 MB y descarta primero lo usado hace más tiempo.

No hay cambios de base de datos ni dependencias nuevas. Las decisiones están en [research.md](./research.md).

## Contexto técnico

**Lenguaje/Versión**: TypeScript sobre Next.js 16.2.7 (App Router) y React 19, el mismo stack del proyecto.

**Dependencias principales**: ninguna nueva. Se usan `node:crypto`, `node:fs/promises`, `node:os` y `node:path`, disponibles en el entorno `nodejs`, que es el predeterminado de las rutas según la guía.

**Almacenamiento**: archivos MP3 en `~/Library/Caches/english-code/tts/`, fuera del repositorio y de iCloud. Sin cambios en la base de datos (FR-015).

**Pruebas**: sin suite automatizada. Verificación manual con [quickstart.md](./quickstart.md); los casos límite del módulo de audio se comprueban con un script temporal fuera del repositorio. Más `npx tsc --noEmit`, `npm run lint` y `npm run build` (Principio VI).

**Plataforma**: solo web, con el servidor en el Mac del dueño.

**Tipo de proyecto**: aplicación web con un único paquete de Next.js.

**Objetivos de rendimiento**: un audio reutilizado empieza a sonar en menos de medio segundo (SC-005).

**Restricciones**: `guardRequest` sigue antes de cualquier lectura de audio (003); la carpeta no supera 200 MB; un fallo al guardar no rompe la respuesta.

**Alcance**: 1 módulo nuevo (`lib/tts-cache.ts`), 1 ruta y 1 página modificadas.

## Constitution Check

*Barrera antes de la Fase 0; revisada de nuevo tras la Fase 1.*

| Principio | Estado | Cómo se cumple |
|---|---|---|
| I. Contenido pensado para el estudiante | PASS | No toca lecciones ni fases. El audio reutilizado es idéntico al generado. |
| II. Secretos en el servidor, una sola puerta | PASS | El audio sigue pasando solo por `/api/tts`, y los IDs de voz siguen solo en esa ruta. La reutilización vive dentro de esa misma puerta. |
| III. Seguridad de los datos y RLS | PASS | Sin esquema, sin seeds y sin escrituras nuevas en la base. Los audios no son datos del estudiante y quedan fuera de la base. |
| IV. Local-first y privado | PASS | Los audios se guardan en el propio Mac, fuera de iCloud y del repositorio público, y no se envían a ningún sitio nuevo. |
| V. Contratos de componentes estables | PASS | Los componentes no cambian su forma de pedir audio; la petición y la respuesta de `/api/tts` son las mismas. |
| VI. Verificado antes de terminar | PASS (2026-11-17) | `tsc`, lint y build pasan; el módulo de audio se probó con un script; el dueño recorrió [quickstart.md](./quickstart.md), y la carpeta de audio, el registro del servidor y la base confirman la reutilización y que Talk espera al botón. |

**Revisión tras el diseño**: sin violaciones.

## Estructura del proyecto

### Documentación

```text
specs/006-credit-savings/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/tts.md
├── checklists/requirements.md
└── tasks.md             # Lo crea /speckit-tasks
```

### Código

```text
lib/tts-cache.ts                    # Nuevo: resumen, lectura, escritura y límite (FR-008, FR-011 a FR-013)
app/api/tts/route.ts                # Busca el audio guardado antes de ElevenLabs; peticiones en curso; X-Audio-Source
app/(app)/talk/page.tsx             # Sin tema al entrar; botón Start a new topic; doble clic (FR-001 a FR-007)

AGENTS.md, README.md, MANUAL_USUARIO.md
```

**Decisión de estructura**: la lógica de archivos queda en `lib/tts-cache.ts`, separada de la ruta, para probarla con un script temporal sin llamar a ElevenLabs. Los componentes que reproducen audio no cambian.

## Orden de implementación recomendado

1. Crear `lib/tts-cache.ts` y probarlo con un script temporal: guardar, leer, archivo vacío y límite con una carpeta y un límite de prueba.
2. Conectar el módulo a `/api/tts`, con el registro de peticiones en curso y la cabecera `X-Audio-Source`. Comprobar el 401 sin sesión.
3. Cambiar el inicio de Talk y proteger el doble clic.
4. Actualizar `AGENTS.md`, `README.md` y `MANUAL_USUARIO.md`.
5. Ejecutar las barreras y [quickstart.md](./quickstart.md).

## Seguimiento de complejidad

| Elemento añadido | Por qué se necesita | Alternativa más simple descartada |
|---|---|---|
| Carpeta de audio con límite en el disco del Mac | Reutilizar entre recargas y días (FR-008) con un tope de espacio (FR-012) | Memoria del servidor: se pierde al reiniciar. Navegador: obliga a cambiar 8 componentes |
| Registro en memoria de peticiones en curso | Dos peticiones iguales a la vez generan una sola llamada (SC-003) | Sin registro: la reproducción automática y un clic rápido pedirían dos veces la misma palabra |
