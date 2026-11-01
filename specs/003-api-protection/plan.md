# Plan de implementación: Protección de la API y del acceso a la aplicación

**Rama**: `003-api-protection-plan` | **Fecha**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificación de la funcionalidad en `specs/003-api-protection/spec.md`

## Resumen

Las 7 rutas de `app/api` que gastan créditos pasan a exigir una sesión válida, comprobada en el servidor por una única función común, y a rechazar entradas desproporcionadas antes de llamar al proveedor. El cliente envía el token de sesión desde las 16 llamadas existentes mediante una única función, que además gestiona la renovación y avisa una sola vez si la sesión venció. El registro de cuentas se cierra en la configuración del servicio de autenticación, con copia de seguridad previa y sin borrar datos. El servidor de la aplicación deja de escuchar en la red local. No se agregan dependencias ni tablas.

## Contexto técnico

**Lenguaje/Versión**: TypeScript sobre Next.js 16.2.7 (App Router) y React 19, el mismo stack del proyecto.

**Dependencias principales**: `@supabase/supabase-js` 2.108, ya instalada; se usa también en el servidor para comprobar la sesión. No hay dependencias nuevas.

**Almacenamiento**: Supabase Postgres local. Sin cambios de esquema ni de datos. Solo cambia `supabase/config.toml`, lo que exige reiniciar los servicios locales (ver [research.md](./research.md) §6).

**Pruebas**: sin suite automatizada. Verificación manual con [quickstart.md](./quickstart.md), más `npx tsc --noEmit`, `npm run lint` y `npm run build`, obligatorio porque se tocan rutas y configuración (Principio VI).

**Plataforma objetivo**: navegador en el propio Mac. El acceso desde el iPhone es la etapa siguiente.

**Tipo de proyecto**: aplicación web única; las rutas de servidor viven en `app/api/*`.

**Objetivos de rendimiento**: la comprobación de sesión es una llamada al servicio de autenticación local en cada petición. No hay un objetivo medido; se comprueba que el audio y la conversación no se noten más lentos (quickstart, escenario 2).

**Restricciones**: nunca `db:reset` ni `supabase stop --no-backup`; copia de seguridad verificada antes de reiniciar servicios; ningún secreto en el cliente.

**Escala/Alcance**: un único usuario; 1 cuenta en la base; 7 rutas; 16 llamadas del cliente en 12 archivos.

## Constitution Check

*GATE: debe pasar antes de la Fase 0. Se vuelve a evaluar después de la Fase 1.*

| Principio | Estado | Justificación |
|---|---|---|
| I. Contenido pensado para el estudiante | N/A | No cambia contenido ni fases. Los mensajes nuevos son de error y van en inglés. |
| II. Secretos solo en el servidor / una sola puerta | PASS | Cada proveedor sigue con su ruta. El contrato `{ text, speaker }` de `/api/tts` se conserva; se agrega el token de sesión como cabecera. Solo la llave pública de Supabase se usa para comprobar la sesión. Nota aparte: el principio no enumera `shadow/generate`, un descuido anterior que corresponde a una enmienda de PARCHE y no bloquea este plan. |
| III. Seguridad de los datos y RLS (NO NEGOCIABLE) | PASS | RLS no cambia y está activa en las 16 tablas. Sin `db:reset`. Se hace un `pg_dump` verificado, fuera del repositorio y de carpetas sincronizadas, antes del único paso riesgoso: reiniciar los servicios locales. |
| IV. Local-first y privado | PASS, con dependencia | Reduce la exposición del servidor de la aplicación. La base abierta a la red local sigue fuera del alcance y queda como dependencia (ver abajo). Tailscale con HTTPS es la etapa siguiente. |
| V. Contratos de componentes estables | PASS | `onComplete()` y las props de las fases no cambian. Solo cambia cómo piden datos al servidor y cómo reaccionan a un error. |
| VI. Verificado antes de terminar | Pendiente hasta implementar | `tsc`, lint, build y verificación en la app corriendo, según [quickstart.md](./quickstart.md). |

**Dependencias nuevas**: ninguna. **Servicios nuevos**: ninguno.

**Re-evaluación post-Fase 1**: el diseño no agrega datos ni dependencias, y los seis principios quedan igual. El estado de `SessionNotice` en el layout no altera el contrato de las fases.

### Dependencia registrada: la base abierta a la red local

La revisión del 2026-11-01 encontró los puertos 54321 a 54324 en `0.0.0.0`, con el firewall del Mac apagado. Esta funcionalidad no lo corrige: quien llegue a Postgres o a Studio se salta toda esta protección. El dueño lo gestiona por separado, y debe resolverse antes de dar por protegido el conjunto. El quickstart incluye la comprobación.

## Estructura del proyecto

### Documentación (esta funcionalidad)

```text
specs/003-api-protection/
├── plan.md              # Este archivo
├── research.md          # Decisiones y mediciones (Fase 0)
├── data-model.md        # Sin tablas nuevas: estados de la sesión y límites (Fase 1)
├── quickstart.md        # Guía de validación (Fase 1)
├── contracts/
│   └── api-protection.md   # Respuestas comunes y límites por ruta (Fase 1)
├── checklists/requirements.md
└── tasks.md             # Salida de /speckit-tasks (no se crea en este comando)
```

### Código fuente (raíz del repositorio)

```text
lib/
├── api-guard.ts         # NUEVO, solo servidor: sesión, tamaño y JSON del cuerpo (FR-001 a FR-003, FR-005, FR-010, FR-012)
└── api.ts               # NUEVO, solo cliente: postJson con token, renovación y aviso (FR-004, FR-007, FR-008)

components/
├── SessionNotice.tsx    # NUEVO: aviso único con inicio de sesión en la misma pantalla (FR-008, FR-009)
├── FloatingVocabulary.tsx   # 1 llamada
├── phases/              # 7 llamadas en 7 archivos; las 3 evaluaciones también corrigen su manejo de errores
└── shadow/              # 4 llamadas en 3 archivos

app/
├── layout.tsx           # Monta SessionNotice
├── page.tsx             # Quita el registro (FR-016)
├── talk/page.tsx        # 4 llamadas
└── api/                 # Las 7 rutas: guarda, validación de campos y errores controlados

supabase/config.toml     # enable_signup = false (FR-014)
package.json             # dev y start con -H 127.0.0.1 (FR-019)
README.md, AGENTS.md, MANUAL_USUARIO.md   # Ya no hay registro; cómo crear la cuenta en una instalación nueva
```

**Decisión de estructura**: dos helpers en `lib/`, como `lib/shadow.ts` y `lib/content.ts`, y un componente global junto a `FloatingVocabulary`. Son tres archivos nuevos, justificados porque FR-005 pide un único lugar reutilizable y porque el aviso no puede vivir en cada una de las 12 pantallas.

## Orden de implementación recomendado

1. **Copia de seguridad y conteos** antes de cualquier cambio.
2. **Cliente primero, en el mismo cambio que las rutas**: `postJson` envía el token aunque el servidor todavía no lo exija, así que ninguna pantalla se rompe a mitad de camino.
3. **Manejo de errores en las 3 evaluaciones antes de exigir sesión**: hoy un error de la ruta llega a `setFeedback` y rompe la pantalla (ver research §5).
4. **Rutas**: guarda, límites y errores.
5. **Registro**: pantalla de inicio, configuración y reinicio de servicios, con conteos antes y después.
6. **Servidor solo en local**: es lo último, porque requiere reiniciar el servidor que usa el dueño.

## Complexity Tracking

No hay violaciones de la constitución que justificar.

| Observación | Por qué importa | Decisión |
|---|---|---|
| El aviso incluye un pequeño formulario de inicio de sesión | Es más que un enlace | Un enlace al inicio perdería el texto escrito (FR-009). Ver research §4. |
| Una llamada al servicio de autenticación por petición | Agrega una consulta local a cada audio | Se acepta: es local, y validar de verdad exige consultar el servicio. Ver research §1. |
