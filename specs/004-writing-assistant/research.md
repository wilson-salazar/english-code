# Investigación: Módulo Tools y Writing Assistant

Mediciones hechas el 2026-11-01 en el Mac del dueño, con Node. Los tiempos en el navegador se confirman en [quickstart.md](./quickstart.md).

## 1. Por qué no basta el corrector del navegador

**Decisión**: desactivarlo en este cuadro (`spellCheck={false}`, `autoCorrect="off"`, `autoCapitalize="off"`) y usar una revisión propia.

**Motivo**: una página web no puede leer las palabras que marca el navegador ni sus sugerencias, de modo que "Fix all" sería imposible. Además, depende del idioma configurado en cada equipo. Si quedara activo, sumaría sus propias marcas a las de la aplicación (FR-016).

## 2. Cómo se detectan las palabras mal escritas

**Decisión**: `nspell` 2.1.5, ejecutado en el navegador, con el diccionario en_US de `dictionary-en` 4.0.0.

| Candidato | Licencia | Tamaño | Sugerencia, media y peor caso | Primera opción sin ordenar |
|---|---|---|---|---|
| `nspell` 2.1.5 | MIT | 42 KB, más `is-buffer` | 2 ms y 12 ms | 23 de 30 |
| `typo-js` 1.4.0 | BSD-3-Clause | 2 MB con sus diccionarios | 328 ms y 843 ms | 23 de 30 |

Las dos aciertan lo mismo, pero `typo-js` tarda más de 100 veces lo que `nspell` y se notaría al abrir el menú.

**Rendimiento medido de `nspell`**: carga en 74 ms y revisa 9796 palabras en 6 ms. Un texto de 5000 caracteres tiene alrededor de 900 palabras, así que se puede revisar entero en cada cambio, sin procesos en segundo plano ni esperas. El tiempo de carga se paga una sola vez, al abrir la página.

**Riesgo aceptado**: `nspell` no publica versiones desde 2022. No usa red ni servicios, y su función es estable, por lo que el riesgo es bajo.

**Alternativas descartadas**: la IA por palabra gastaría créditos y añadiría demora (FR-015, FR-023). Una ruta local en el servidor añadiría una petición por palabra, sin ventajas para un único usuario.

**Tipos**: `@types/nspell` 2.1.6 (MIT), solo de desarrollo.

## 3. Cómo se ordenan las sugerencias

`nspell` solo acierta la primera opción en 23 de 30 casos. Por ejemplo, sugiere `ten` para `teh` y `rich` para `wich`. SC-004 pide al menos 9 de cada 10.

**Decisión**: ordenar sus candidatos, más las transposiciones de letras que sean palabras válidas, con estos criterios:

1. Menor distancia de edición, contando una transposición como un solo cambio.
2. Palabra más común según la lista SCOWL, tamaños 10, 20 y 35: 38 055 palabras.
3. Frecuencia en las lecciones de la aplicación.

La lista se combina en un solo archivo, `common-words.json`, donde el orden indica la frecuencia.

**Resultado con 90 palabras mal escritas, en 3 conjuntos**:

| Conjunto | Marcadas | Primera opción | Entre las 3 primeras |
|---|---|---|---|
| A | 30 de 30 | 29 | 30 |
| B | 28 de 30 | 25 | 27 |
| C | 28 de 30 | 24 | 27 |
| **Total** | **86 de 90** | **78 de 86 (90,7%)** | **84 de 86 (97,7%)** |

Las 4 sin marcar son palabras reales: `manger`, `tho`, `meting` y `cant`. Las corresponde detectar al inspector de sentido, por contexto.

**Límite de esta medición**: elegí el orden después de ver los conjuntos A y B, y el C ya se había usado en una variante anterior. Por eso SC-004 se vuelve a medir con oraciones nuevas ([quickstart](./quickstart.md), escenario 3).

**Variante descartada**: usar solo la frecuencia en las lecciones (1307 palabras) y preferir la opción más larga en caso de empate dio aciertos de 26, 25 y 22, con errores como `bussiness` → `bossiness`.

**Contracciones**: `dont` sugiere `done`, `font` y `don`, pero no `don't`. Se añade una tabla corta de contracciones escritas sin apóstrofo. `cant` no se marca porque es una palabra válida.

**Origen de los archivos**: la lista viene de `wordlist-english` 1.2.1 (SCOWL). Se copia con un script de una sola vez, y su licencia exige conservar el aviso de derechos, por lo que va en `public/dictionaries/en/LICENSE`, junto al de `dictionary-en`.

**Peso de lo que se descarga al abrir la herramienta**:

| Archivo | Tamaño | Comprimido |
|---|---|---|
| `index.dic` | 551 762 bytes | 190 930 bytes |
| `index.aff` | 3086 bytes | 1013 bytes |
| Lista de frecuencia (aprox.) | 337 151 bytes | 110 307 bytes |

Se cargan solo en esta página, con `import()` dinámico de `nspell` ([guía de carga diferida de Next.js](../../node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md)), y con `fetch` desde `public/`. La guía de la [carpeta public](../../node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/public-folder.md) indica `Cache-Control: public, max-age=0`, de modo que el navegador los vuelve a validar en cada visita. Para una aplicación local, ese costo es aceptable.

## 4. Qué palabras no se revisan

Medí el texto real de las lecciones: 9796 palabras de `scenario_phases`, `chapter_phases` y `vocabulary`, de solo lectura. Excluyendo las palabras en mayúsculas, con mayúsculas internas o con otros símbolos, quedan 35 desconocidas distintas: 21 en minúscula y 14 con mayúscula inicial, casi todas términos técnicos o nombres propios.

**Decisión**: no revisar una palabra si:

| Regla | Ejemplos |
|---|---|
| Todo en mayúsculas | `API`, `QA`, `SQL` |
| Mayúsculas internas | `useState`, `GitHub` |
| Contiene dígitos, `_`, `/`, `.` interno, `@` o `://` | `file.ts`, `user_id`, `v2` |
| Va entre comillas invertidas | `` `npm run dev` `` |
| Empieza con mayúscula en medio de una oración | `Priya`, `Jira`, `Datadog` |
| Está en la lista de términos permitidos | `standup`, `backend` |

**Lista inicial de términos permitidos**, sin distinguir mayúsculas y tomada de la medición: `handoff`, `counterproposal`, `runbook`, `async`, `standup`, `config`, `mortem`, `backend`, `changelog`, `microservices`, `failover`, `dev`, `api`, `frontend`, `env`, `timezones`, `cancelled`, y además `hotfix`, `repo` y `codebase`, que el diccionario tampoco reconoce.

Las partes de una palabra con guion se revisan por separado, y se aceptan prefijos cortos como `de` en `de-escalate`.

**Lo que sí sigue marcado**: `builded` y `tuesday` en minúscula, que son errores reales.

**Límite conocido**: un nombre propio al inicio de una oración (por ejemplo, `Priya said…`) se marca, porque ahí la mayúscula no indica que sea un nombre. No hay opción de "ignorar" ni de "agregar al diccionario", porque la spec no la pide. Es poco frecuente y no bloquea nada.

## 5. Cómo se marca en rojo sin mover el cursor

**Decisión**: una capa detrás del `<textarea>`.

- Un `<div>` con la misma tipografía, tamaño, relleno y ancho repite el texto y envuelve las palabras marcadas en `<mark>`.
- El `<textarea>` va encima, con fondo y texto transparentes, y `caret-color` visible. El texto se ve a través de la capa, y las palabras marcadas salen en rojo con subrayado ondulado.
- El desplazamiento de las dos se sincroniza con `onScroll`, y las dos usan `overflow-y: scroll` para que la barra no cambie el ancho y descuadre las líneas.

Como el `<textarea>` no se reemplaza, el cursor, la selección, pegar y deshacer siguen siendo los del navegador.

**Alternativa descartada**: un área `contenteditable`, porque obligaría a reimplementar el cursor y el pegado, con el mayor riesgo de toda la funcionalidad. También se descarta una biblioteca de editor enriquecido: sería una dependencia grande para una sola vista.

**Palabra en curso (FR-015)**: una palabra que termina justo en el cursor, sin un separador detrás, no se evalúa hasta 700 ms sin escribir. Las demás se marcan en el mismo render. Sin esto, cada palabra se pondría roja mientras se escribe.

## 6. Clic derecho y menú de opciones

**Decisión**: `onContextMenu` en el `<textarea>` compara las coordenadas del clic con `getClientRects()` de cada `<mark>`.

- **Si cae sobre una marca**: `preventDefault()` y se abre un menú propio, con hasta 5 opciones (FR-017).
- **Si no**: no se hace nada, y aparece el menú habitual del navegador (FR-019).

El menú se cierra con `Esc`, al hacer clic fuera, o si el texto cambia. Antes de reemplazar se comprueba que en esa posición siga la misma palabra, para no cambiar otra distinta. Se conserva la mayúscula inicial de la original.

**Alternativa descartada**: `document.caretPositionFromPoint`, porque no es fiable dentro de un `<textarea>` en todos los navegadores.

## 7. Cómo se deshace "Fix all" (FR-022)

**Decisión**: una copia del texto anterior. "Fix all" guarda `{ before, after }` y muestra un botón "Undo" mientras el texto siga igual a `after`. Al seguir escribiendo, desaparece.

**Motivo**: cambiar el valor de un cuadro de texto por código puede romper el historial nativo de `Cmd+Z`, según el navegador, y `document.execCommand` está obsoleto. Con la copia, SC-009 queda garantizado.

**Limitación aceptada**: tras reemplazar una palabra desde el menú, `Cmd+Z` puede no recuperarla. La spec solo exige deshacer "Fix all", y la palabra original se ve en todo momento antes de elegir.

## 8. La ruta del inspector

**Decisión**: `POST /api/writing-assistant`, según el [contrato](./contracts/writing-assistant.md).

- **Protección**: `guardRequest` con 32 KB y `exceedsLength(text, 5000)`, igual que `evaluate`, que ya admite respuestas de 5000 caracteres.
- **Salida estructurada**: herramienta forzada con `tool_choice`, como `vocabulary/translate`. Es más fiable que buscar JSON en el texto, como hace `evaluate`, y FR-025 exige no confundir una respuesta inválida con "no hay nada que mejorar".
- **Modelo**: `claude-haiku-4-5-20251001`, el de las demás rutas. Cambiar de modelo sería una decisión aparte, para toda la aplicación.
- **Un solo intento**: un reintento automático gastaría créditos sin que se pidiera; el estudiante puede volver a pulsar el botón.
- **El texto es un dato**: el prompt de sistema indica que el texto es solo para revisar, nunca instrucciones que seguir.
- **Nivel**: el cliente lo lee como `ShadowSession`, con `levels(code)` y `B1` por defecto, y lo envía.
- **Clave faltante**: 503 con un mensaje claro, después de la guarda, como `vocabulary/translate`.

## 9. Dónde va Tools en el dashboard

**Decisión**: en `app/dashboard/page.tsx`:

- Agregar `'tools'` al tipo `DashboardView` (línea 51).
- Agregar `{ id: 'tools', label: 'Tools', description: 'Writing and more' }` al arreglo del menú (líneas 331 a 337), entre Shadowing y Progress.
- Agregar una sección `activeView === 'tools'` con el mismo marcado de tarjetas que `activeView === 'talk'` (línea 363), con un arreglo de herramientas para sumar otras sin rediseñar (FR-003).

La tarjeta abre `/tools/writing-assistant` con `router.push`. Son 2 clics desde el dashboard (SC-001).

## 10. Otros detalles comprobados

- **Sesión**: la página comprueba la sesión al montarse como `ShadowSession` (líneas 113 a 126) y redirige a `/` si no hay. El aviso de sesión vencida ya está montado en `app/layout.tsx`.
- **Copiar**: `navigator.clipboard.writeText` funciona en `localhost`, que es un contexto seguro. Si falla, se avisa, y el texto del cuadro se puede seleccionar a mano.
- **Widget de vocabulario**: `FloatingVocabulary` es `fixed` en la esquina inferior derecha en todas las páginas (`right-4 bottom-4`). La página deja margen inferior para que no tape los botones.
- **Respuesta obsoleta**: la recomendación guarda el texto que revisó; si difiere del actual, se muestra el aviso. Salir de la página cancela la petición con `AbortController`.
