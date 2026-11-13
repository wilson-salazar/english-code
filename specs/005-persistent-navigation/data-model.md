# Modelo de datos: Menú de navegación siempre visible

Esta funcionalidad no tiene tablas ni cambios de esquema (FR-018). Todo vive en la memoria del navegador mientras la pantalla está abierta.

## Sección

Una entrada del menú.

| Campo | Valores | Regla |
|---|---|---|
| `id` | `learning`, `grammar`, `talk`, `shadow`, `tools`, `progress` | Fijo, en este orden (FR-002) |
| `label` | `Learning path`, `Grammar`, `Talk with AI`, `Shadowing`, `Tools`, `Progress` | Igual que hoy |
| `description` | `Lessons and scenarios`, `Core grammar chapters`, `Voice conversation`, `Pronunciation practice`, `Writing and more`, `KPIs and skills` | Igual que hoy |
| `href` | `/dashboard?section=<id>` | Learning path también se abre con `/dashboard` sin parámetro |

La sección activa se deduce de la dirección, según la tabla de [research §3](./research.md). Un valor desconocido en `section` abre `learning`.

## Cuenta

Lo que `AppShell` carga una vez y comparte con `useAccount()`.

| Campo | Origen | Uso |
|---|---|---|
| `user` | `users`, con su nivel | Nombre en el encabezado, y nivel para el dashboard |
| `levels` | `levels`, por `order_index` | Selector de nivel |
| `changeLevel(level)` | Actualiza `users.level_id`, como hoy | Lo usa el selector; el dashboard recarga sus listas al cambiar el nivel |

Sin usuario, `AppShell` no muestra el menú, y la pantalla envía a `/` como hoy.

## Trabajo pendiente

El registro de `NavigationGuardProvider`.

| Elemento | Descripción |
|---|---|
| Fuente | Cada llamada a `useUnsavedWork(condición)`, con un identificador propio |
| Conjunto activo | Las fuentes con la condición verdadera. Hay trabajo pendiente si no está vacío |
| Alta y baja | Una fuente entra cuando su condición pasa a verdadera, y sale cuando pasa a falsa o cuando su pantalla se cierra |

Las condiciones de cada pantalla están en [research §5](./research.md).

### Estados de una salida

```text
clic en el menú, la ruta de migas o "Log out"
  ├── conjunto vacío ────────────────────────────→ sale sin preguntar (FR-013)
  └── conjunto con fuentes → diálogo abierto
        ├── "Stay", Esc o cerrar el diálogo ─────→ todo sigue igual (FR-014)
        └── "Leave" ─────────────────────────────→ sale; la pantalla se cierra y
                                                   descarta lo pendiente (FR-015)
```

Con el conjunto no vacío, recargar o cerrar la pestaña muestra el aviso del navegador (FR-016).

## Ruta de migas

Una lista de 2 elementos: la sección, con enlace, y la pantalla actual, sin enlace. Los textos de cada pantalla están en [research §8](./research.md).
