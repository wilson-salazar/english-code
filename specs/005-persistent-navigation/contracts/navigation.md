# Contrato: Menú común y protección de trabajo pendiente

Interfaces internas que usarán las pantallas actuales y los módulos futuros, como Interview. No hay rutas de API nuevas.

## Direcciones

| Dirección | Pantalla |
|---|---|
| `/dashboard` | Learning path |
| `/dashboard?section=<id>` | La sección `<id>` del [modelo de datos](../data-model.md#sección) |
| `/scenario/<id>`, `/chapter/<id>`, `/talk`, `/talk/open`, `/shadow`, `/tools/writing-assistant` | Sin cambios |

Todas las pantallas con sesión viven en `app/(app)/`, y se muestran dentro de `AppShell`. Para que un módulo nuevo tenga el menú, basta con crear su página en ese grupo y añadir su prefijo a la tabla de secciones activas.

## `useUnsavedWork(active: boolean): void`

Declara que la pantalla tiene trabajo pendiente mientras `active` sea verdadero.

- Se puede llamar varias veces en una misma pantalla, y desde varios componentes a la vez.
- La fuente se retira sola cuando `active` pasa a falso o el componente se cierra.
- Fuera de `AppShell` no hace nada, para que un componente pueda usarse también sin el menú.

## `GuardedLink`

Igual que `Link` de Next, con la protección del diálogo.

| Prop | Tipo | Regla |
|---|---|---|
| `href` | `string` | Destino dentro de la app |
| `children`, `className`, `aria-current` | Los de `Link` | Sin cambios |

Con trabajo pendiente, cancela la navegación con `onNavigate` y abre el diálogo. `Cmd`+clic o `Ctrl`+clic abren otra pestaña sin preguntar.

## `useGuardedAction(): (action: () => void) => void`

Ejecuta `action` directamente o tras confirmar en el diálogo. Lo usan las salidas que no son un enlace, como "Log out".

## `Breadcrumbs`

| Prop | Tipo | Regla |
|---|---|---|
| `section` | `SectionId` | Primer elemento, con enlace a su sección |
| `current` | `string` | Segundo elemento, sin enlace |

## `useAccount()`

Devuelve `{ user, levels, changeLevel }`, descritos en el [modelo de datos](../data-model.md#cuenta). Fuera de `AppShell` lanza un error, porque solo lo usan pantallas del grupo.

## Textos de la interfaz

| Lugar | Texto |
|---|---|
| Título del diálogo | `Leave this page?` |
| Mensaje del diálogo | `You have unsaved work. If you leave now, it will be lost.` |
| Botón predeterminado | `Stay` |
| Botón para salir | `Leave` |
| Etiqueta del menú | `Main sections` |
| Etiqueta de la ruta de migas | `Breadcrumb` |

El aviso al recargar o cerrar la pestaña lo escribe el navegador, y la aplicación no puede cambiar su texto.
