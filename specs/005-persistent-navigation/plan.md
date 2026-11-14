# Plan de implementación: Menú de navegación siempre visible

**Rama**: `005-persistent-navigation-plan` | **Fecha**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificación de la funcionalidad en `specs/005-persistent-navigation/spec.md`

## Resumen

El menú y el encabezado del dashboard pasan a un marco común, `AppShell`, montado por el diseño de un grupo de rutas `app/(app)/` que reúne todas las pantallas con sesión. Las direcciones no cambian, salvo que cada sección del dashboard gana la suya, `/dashboard?section=<id>`, para conservarse al recargar.

Cada pantalla declara su trabajo pendiente con un gancho, `useUnsavedWork`. Los enlaces del menú y de la ruta de migas consultan ese registro y, si hay algo pendiente, cancelan la navegación y muestran un diálogo con "Stay" como opción predeterminada. Las pantallas de módulo cambian "← Dashboard" por una ruta de migas, y las fases que no lo hacían detienen su audio y su micrófono al cerrarse.

No hay cambios de base de datos ni de API. Las decisiones están en [research.md](./research.md).

## Contexto técnico

**Lenguaje/Versión**: TypeScript sobre Next.js 16.2.7 (App Router) y React 19, el mismo stack del proyecto.

**Dependencias principales**: ninguna nueva. Se usan `Link` (con `onNavigate`), `usePathname`, `useSearchParams` y `useRouter` de Next, y el elemento nativo `<dialog>`.

**Almacenamiento**: ninguno. El registro de trabajo pendiente vive en memoria mientras la pantalla está abierta (FR-018).

**Pruebas**: sin suite automatizada. Verificación manual con [quickstart.md](./quickstart.md), más `npx tsc --noEmit`, `npm run lint` y `npm run build`, obligatorio porque se mueven rutas (Principio VI).

**Plataforma**: solo web, en navegador de escritorio.

**Tipo de proyecto**: aplicación web con un único paquete de Next.js.

**Objetivos de rendimiento**: cambiar de sección dentro del dashboard sin volver a cargar sus datos, y sin parpadeo del menú al pasar a un módulo.

**Restricciones**: sin cambios en las props ni en `onComplete()` de las fases (Principio V); conservar el desplazamiento de la ventana, del que depende Talk; sin desplazamiento horizontal a 1280 píxeles (SC-007).

**Alcance**: 1 diseño nuevo, 3 componentes nuevos y un archivo de secciones, 6 carpetas movidas, y cambios en 4 páginas y 11 componentes.

## Constitution Check

*Barrera antes de la Fase 0; revisada de nuevo tras la Fase 1.*

| Principio | Estado | Cómo se cumple |
|---|---|---|
| I. Contenido pensado para el estudiante | PASS | No toca lecciones, fases ni su orden. Las fases se siguen mostrando una a una. |
| II. Secretos en el servidor, una sola puerta | PASS | No añade servicios externos ni rutas de API. El audio sigue pasando por `/api/tts`. |
| III. Seguridad de los datos y RLS | PASS | Sin esquema, sin seeds y sin escrituras nuevas. Cambiar de nivel usa la misma actualización de hoy. SC-008 lo comprueba con conteos. |
| IV. Local-first y privado | PASS | Nada nuevo sale del equipo. |
| V. Contratos de componentes estables | PASS | Las fases conservan sus props y `onComplete()`. Solo añaden dentro el gancho `useUnsavedWork` y un efecto de limpieza. `app/scenario/[id]/page.tsx` y `app/chapter/[id]/page.tsx` se mueven al grupo sin cambiar su forma de montar las fases. |
| VI. Verificado antes de terminar | PASS con una excepción (2026-11-13) | `tsc`, lint y build pasan, y el dueño recorrió [quickstart.md](./quickstart.md) en la app corriendo. Queda sin verificar el desplazamiento automático de Talk tras enviar una respuesta (T045). |

**Revisión tras el diseño**: sin violaciones. El diseño no añade dependencias, tablas, servicios externos ni secretos.

## Estructura del proyecto

### Documentación

```text
specs/005-persistent-navigation/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/navigation.md
├── checklists/requirements.md
└── tasks.md             # Lo crea /speckit-tasks
```

### Código

```text
app/
├── layout.tsx                         # Sin cambios: SessionNotice y FloatingVocabulary
├── page.tsx, reset-password/          # Sin cambios y fuera del grupo: sin menú (FR-006)
└── (app)/
    ├── layout.tsx                     # Nuevo: monta AppShell
    ├── dashboard/page.tsx             # Movido; sin encabezado ni menú propios; lee ?section= (FR-004)
    ├── scenario/[id]/page.tsx         # Movido; ruta de migas, "← Back" desde la fase 2, fin → Learning path
    ├── chapter/[id]/page.tsx          # Movido; igual que la lección, fin → Grammar
    ├── talk/page.tsx, talk/open/      # Movidos; ruta de migas, trabajo pendiente, barra alineada
    ├── shadow/page.tsx                # Movido
    └── tools/writing-assistant/       # Movido

components/navigation/
├── AppShell.tsx                       # Nuevo: encabezado, nivel, Log out, menú, contextos (FR-001 a FR-005)
├── NavigationGuard.tsx                # Nuevo: registro, useUnsavedWork, GuardedLink, diálogo, beforeunload (FR-011 a FR-016)
├── Breadcrumbs.tsx                    # Nuevo (FR-007)
└── sections.ts                        # Nuevo: las 6 secciones y la sección activa por dirección

components/phases/                     # useUnsavedWork en 6 fases; limpieza de audio y micrófono en 5
components/shadow/                     # useUnsavedWork en ShadowSession; ruta de migas; limpieza en FinalSentenceStep
components/tools/WritingAssistant.tsx  # useUnsavedWork y ruta de migas

AGENTS.md, README.md, MANUAL_USUARIO.md
```

**Decisión de estructura**: el grupo `(app)` hace que cualquier página nueva con sesión, como Interview, tenga el menú solo por vivir ahí. La lógica de navegación queda en `components/navigation/`, separada de los módulos, que solo usan sus ganchos y componentes. Las secciones del dashboard siguen en una sola página, porque comparten los datos que ya carga.

## Orden de implementación recomendado

1. Crear `sections.ts` y `NavigationGuard.tsx`, sin usarlos aún.
2. Crear `AppShell.tsx` y `app/(app)/layout.tsx`, y mover las 6 carpetas al grupo con `git mv`. Comprobar que todas las direcciones siguen respondiendo.
3. Quitar del dashboard el encabezado y el menú, conectar `useAccount()` y leer `?section=` (Historia 1).
4. Registrar el trabajo pendiente en cada pantalla, según [research §5](./research.md) (Historia 2).
5. Añadir la limpieza de audio y micrófono ([research §6](./research.md)).
6. Cambiar "← Dashboard" por la ruta de migas, y los destinos al terminar (Historia 3).
7. Alinear la barra de Talk y revisar los anchos ([research §9](./research.md)).
8. Actualizar `AGENTS.md`, `README.md` y `MANUAL_USUARIO.md`.
9. Ejecutar las barreras y [quickstart.md](./quickstart.md).

## Seguimiento de complejidad

| Elemento añadido | Por qué se necesita | Alternativa más simple descartada |
|---|---|---|
| Grupo de rutas `(app)` y movimiento de 6 carpetas | Un único diseño con el menú para todas las pantallas con sesión, que no se reconstruye al navegar | Copiar el menú en cada página: se reconstruiría en cada navegación y habría que repetirlo en cada módulo nuevo |
| Registro de trabajo pendiente con contexto | Varias fuentes por pantalla y una sola comprobación en todas las salidas | Un indicador por página: no cubre fases con varias fuentes ni "Log out" en el encabezado |
| Diálogo propio con `<dialog>` | "Stay" como opción predeterminada, con el aspecto de la app | `window.confirm`: no permite elegir el botón predeterminado |
