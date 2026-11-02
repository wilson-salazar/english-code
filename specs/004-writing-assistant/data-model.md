# Modelo de datos: Módulo Tools y Writing Assistant

**No hay cambios de base de datos** (FR-026, SC-010): ni tablas, ni migraciones, ni seeds. Todo lo siguiente vive en memoria mientras la página está abierta, y se pierde al salir.

## Herramienta

Elemento del arreglo de herramientas de `app/dashboard/page.tsx`.

| Campo | Tipo | Valor en esta versión |
|---|---|---|
| `id` | texto | `writing-assistant` |
| `eyebrow` | texto | Categoría de la tarjeta |
| `title` | texto | `Writing Assistant` |
| `description` | texto | Una frase |
| `href` | texto | `/tools/writing-assistant` |

## Palabra marcada

Se calcula de nuevo a partir del texto; no se edita ni se guarda.

| Campo | Tipo | Regla |
|---|---|---|
| `start`, `end` | enteros | Posición en el texto; `text.slice(start, end) === word` |
| `word` | texto | Tal como está escrita |
| `suggestions` | textos, de 0 a 5 | Se calculan al abrir el menú o al pulsar "Fix all", y se guardan por palabra para no repetir el cálculo |

No se marca lo que excluyen las reglas de [research §4](./research.md), ni la palabra en curso ([research §5](./research.md)).

## Revisión del inspector

```text
idle → checking → natural
                → improved
                → not_english
                → error
```

| Estado | Botón del inspector | Cuadro de recomendación | Botón de copiar |
|---|---|---|---|
| `idle` | Activo si hay texto dentro del límite | Vacío | No disponible |
| `checking` | **Deshabilitado** (FR-014) | Indica que se está revisando | No disponible |
| `natural` | Activo | Indica en inglés que la oración o el párrafo está bien; el cliente cuenta las oraciones del texto revisado para elegir el mensaje | No disponible |
| `improved` | Activo | Muestra la recomendación | Disponible |
| `not_english` | Activo | Indica que solo se revisa inglés | No disponible |
| `error` | Activo, para reintentar | Muestra el mensaje | No disponible |

**Campos adicionales**: `recommendation` (texto) y `reviewedText` (el texto enviado). Si `reviewedText` difiere del texto actual, se muestra el aviso de versión anterior, y la recomendación se puede seguir copiando.

Al pulsar otra vez, el resultado anterior sigue visible hasta que llegue el nuevo. Si la nueva revisión falla, se muestra el error y la recomendación anterior se retira, para no presentarla como vigente.

## Deshacer "Fix all"

| Campo | Tipo | Regla |
|---|---|---|
| `before` | texto | El texto antes de arreglar |
| `after` | texto | El texto después de arreglar |

"Undo" se muestra solo mientras el texto actual sea igual a `after`, y restaura `before` exactamente (SC-009).

"Fix all" se aplica de la última palabra a la primera, para que las posiciones sigan siendo válidas. Omite las palabras sin sugerencias (FR-021), que siguen marcadas.

## Límites

| Valor | Límite | Dónde se aplica |
|---|---|---|
| Texto | 5000 caracteres | En el cliente, antes de enviar, con aviso y sin perder el texto; y en la ruta |
| Cuerpo de la petición | 32 KB | `guardRequest` |
| `level` | `A2`, `B1`, `B2` o `C1`, opcional | Ruta |
| Opciones del menú | 5 | Cliente |
