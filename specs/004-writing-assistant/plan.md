# Plan de implementación: Módulo Tools y Writing Assistant

**Rama**: `004-writing-assistant-plan` | **Fecha**: 2026-11-01 | **Spec**: [spec.md](./spec.md)

**Entrada**: Especificación de la funcionalidad en `specs/004-writing-assistant/spec.md`

## Resumen

Se agrega al menú del dashboard un módulo Tools, con una tarjeta que abre la página del Writing Assistant. La página tiene dos revisiones independientes:

- **Palabras**: se revisan en el navegador con un diccionario local, así que marcar en rojo y sugerir no gasta créditos. Una capa detrás del cuadro de texto pinta las palabras marcadas, y el clic derecho sobre ellas abre un menú propio.
- **Inspector de sentido**: cada clic llama a una ruta nueva del servidor, protegida con `guardRequest`, que usa la IA y devuelve una versión más natural si hace falta.

No hay cambios de base de datos. Las decisiones y sus mediciones están en [research.md](./research.md).

## Contexto técnico

**Lenguaje/Versión**: TypeScript sobre Next.js 16.2.7 (App Router) y React 19, el mismo stack del proyecto.

**Dependencias principales**: `nspell` 2.1.5 es la única dependencia de ejecución nueva, y `@types/nspell` la de desarrollo; las dos tienen licencia MIT. La justificación está en [research §2](./research.md). Los diccionarios se copian a `public/`, con sus licencias, sin añadir paquetes. El inspector usa `@anthropic-ai/sdk`, ya instalado.

**Almacenamiento**: ninguno. El texto y las recomendaciones existen solo mientras la página está abierta (FR-026).

**Pruebas**: sin suite automatizada. Verificación manual con [quickstart.md](./quickstart.md), más `npx tsc --noEmit`, `npm run lint` y `npm run build`, obligatorio porque se añaden rutas y una dependencia (Principio VI).

**Plataforma**: solo web, en navegador de escritorio. Se prueba en el navegador integrado y en el que usa el dueño.

**Tipo de proyecto**: aplicación web con un único paquete de Next.js.

**Objetivos de rendimiento**: marca en rojo en menos de 1 segundo tras terminar la palabra (SC-003) y resultado del inspector en menos de 5 segundos con hasta 500 caracteres (SC-002).

**Restricciones**: sin créditos por pulsación (FR-023), máximo de 5000 caracteres (FR-006), y sesión exigida en la ruta (FR-024).

**Alcance**: 1 módulo nuevo, 1 página, 1 ruta de API, y un único usuario.

## Dependencia: 003 sin fusionar

Esta rama parte de `003-api-protection-implement`, porque necesita `guardRequest`, `postJson` y `SessionNotice`, que aún no están en `main`. Hay que fusionar 003 antes que 004, o el PR de 004 mostrará también todos los cambios de 003.

## Constitution Check

*Barrera antes de la Fase 0; revisada de nuevo tras la Fase 1.*

| Principio | Estado | Cómo se cumple |
|---|---|---|
| I. Contenido pensado para el estudiante | PASS | No toca lecciones ni fases. La recomendación se adapta al nivel del estudiante, y el prompt conoce el contexto profesional de tecnología (FR-012). |
| II. Secretos en el servidor, una sola puerta | PASS con enmienda pendiente | La llamada a Anthropic vive en una ruta del servidor, y `ANTHROPIC_API_KEY` no llega al cliente. La revisión de palabras no usa ningún servicio externo. La lista de rutas del Principio II debe incluir la ruta nueva; hace falta una enmienda PARCHE, que también puede corregir la omisión de `shadow/generate`. Requiere aprobación del dueño en un cambio aparte. |
| III. Seguridad de los datos y RLS | PASS | Sin esquema, sin seeds y sin escrituras. SC-010 lo comprueba con conteos. No se ejecuta ningún reinicio de la base. |
| IV. Local-first y privado | PASS | La revisión de palabras funciona en el navegador. El texto sale del equipo solo al pulsar el inspector, hacia el mismo proveedor que ya usan las evaluaciones. |
| V. Contratos de componentes estables | PASS | No toca las fases ni `onComplete()`. |
| VI. Verificado antes de terminar | Parcial (2026-11-01): `tsc`, lint y build pasan; faltan pruebas del dueño | `tsc`, lint, build y verificación en la app corriendo, según [quickstart.md](./quickstart.md), que registra cada escenario. Pasa a PASS cuando el dueño complete T050 y T051. |

**Restricción del stack**: `nspell` es una dependencia de ejecución nueva. Está justificada en [research §2](./research.md) y en la tabla de complejidad.

**Revisión tras el diseño**: sin violaciones nuevas. El diseño no añade tablas, servicios externos ni secretos.

## Estructura del proyecto

### Documentación

```text
specs/004-writing-assistant/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/writing-assistant.md
├── checklists/requirements.md
└── tasks.md             # Lo crea /speckit-tasks
```

### Código

```text
app/
├── dashboard/page.tsx                # Vista 'tools' y su entrada en el menú (FR-001 a FR-003)
├── tools/writing-assistant/page.tsx  # Página nueva, como app/shadow/page.tsx
└── api/writing-assistant/route.ts    # Ruta nueva del inspector (FR-007 a FR-012, FR-024)

components/tools/
├── WritingAssistant.tsx              # Vista completa y estado (FR-004 a FR-014, FR-020 a FR-025)
└── SpellCheckedTextarea.tsx          # Cuadro con capa de marcas y menú (FR-015 a FR-019)

lib/spelling/
├── checker.ts                        # Carga diccionarios, revisa y ordena sugerencias
├── tokens.ts                         # Separa palabras y decide cuáles se revisan
└── allowed-terms.ts                  # Términos técnicos y de trabajo (SC-005)

public/dictionaries/en/
├── index.aff, index.dic              # Copiados de dictionary-en 4.0.0
├── common-words.json                 # Palabras por frecuencia de uso, para ordenar
└── LICENSE                           # Licencias de los dos orígenes

package.json, AGENTS.md, README.md, MANUAL_USUARIO.md
```

**Decisión de estructura**: la página sigue el patrón de `app/shadow/page.tsx`, que solo monta un componente. La lógica de palabras queda en `lib/spelling/` porque no depende de React, lo que permite medirla por separado. No se crea una abstracción de herramientas: la lista de Tools es un arreglo dentro del dashboard, como el del menú (FR-003).

## Orden de implementación recomendado

1. Copiar los diccionarios a `public/`, instalar `nspell` y crear `lib/spelling/`.
2. Medir SC-004 y SC-005 con la lógica real, antes de construir la interfaz.
3. Crear la ruta del inspector y comprobar sus rechazos.
4. Crear la página con el cuadro de texto y el inspector (Historia 1, P1).
5. Agregar el módulo Tools al dashboard (Historia 4, P1).
6. Agregar las marcas en rojo y el menú de clic derecho (Historia 2, P2).
7. Agregar "Fix all" y "Undo" (Historia 3, P3).
8. Actualizar `AGENTS.md`, `README.md` y `MANUAL_USUARIO.md`.
9. Ejecutar las barreras y [quickstart.md](./quickstart.md).

## Seguimiento de complejidad

| Elemento añadido | Por qué se necesita | Alternativa más simple descartada |
|---|---|---|
| Dependencia `nspell` | Las reglas de un corrector (plurales, conjugaciones, sufijos) y sus sugerencias no son triviales de escribir | Corrector del navegador: no permite conocer las sugerencias, ni "Fix all" (FR-016). IA por palabra: gastaría créditos y no sería inmediata (FR-015, FR-023) |
| 996 KB de diccionarios y licencias en el repositorio | Hacen falta en el navegador. Se descargan solo al abrir la herramienta, unos 304 KB comprimidos | Solo `nspell`, sin lista de frecuencia: la primera opción acierta 23 de 30, por debajo de SC-004 |
| Capa detrás del cuadro de texto | Un cuadro de texto no puede colorear palabras individuales | Área editable enriquecida: el cursor, pegar y deshacer quedarían a cargo de la aplicación, con mucho más riesgo |
