# Investigación: Menú de navegación siempre visible

Decisiones tomadas tras leer el código actual y la guía de Next.js 16.2.7 en `node_modules/next/dist/docs/`. Cada sección indica la decisión, por qué se tomó y qué se descartó.

## 1. Dónde vive el menú

**Decisión**: un grupo de rutas `app/(app)/` con su propio `layout.tsx`, que monta un componente de cliente `AppShell` con el encabezado y el menú. Se mueven a ese grupo `dashboard`, `scenario/[id]`, `chapter/[id]`, `talk` (con `talk/open`), `shadow` y `tools`. `app/page.tsx` y `app/reset-password` quedan fuera, así que no muestran el menú (FR-006).

**Por qué**: según la guía (`route-groups.md`), los paréntesis organizan carpetas sin cambiar las direcciones, así que `/dashboard`, `/scenario/...` y las demás siguen igual. Un diseño (`layout.md`) no se vuelve a renderizar al navegar, de modo que el menú no se reconstruye ni parpadea al cambiar de pantalla. Como hay un `app/layout.tsx` raíz, no hay varios diseños raíz ni recargas completas.

**Descartado**:
- Repetir el menú dentro de cada página: se reconstruiría en cada navegación y habría que acordarse de añadirlo en cada módulo nuevo, como Interview.
- Un menú en `app/layout.tsx` que se oculte según la ruta: mezclaría las pantallas sin sesión con las demás, y obligaría a mantener una lista de exclusiones.

## 2. Cómo se conserva la sección al recargar (FR-004)

**Decisión**: las secciones del dashboard se identifican con un parámetro: `/dashboard?section=grammar`. Sin parámetro, o con un valor desconocido, se abre Learning path. El dashboard lee el parámetro con `useSearchParams`, y la página se envuelve en `<Suspense>`.

**Por qué**: cambiar solo el parámetro no vuelve a montar la página del dashboard, así que se conservan los datos ya cargados y cambiar de sección es inmediato, como hoy. La guía (`use-search-params.md`) exige un límite `Suspense` para que el build de producción no falle con una página que usa `useSearchParams`.

**Descartado**:
- Una ruta por sección (`/dashboard/grammar`): obliga a partir el dashboard en 6 páginas, y `/talk` y `/shadow` ya están ocupadas por los módulos.
- Una ruta opcional `[[...section]]`: cada cambio de sección cambia el segmento, y la página puede volver a montarse y recargar sus datos.

## 3. Cómo se marca la sección actual (FR-003)

**Decisión**: `AppShell` calcula la sección con `usePathname` y, en `/dashboard`, con `useSearchParams`:

| Dirección | Sección |
|---|---|
| `/dashboard?section=<id>` | `<id>`, o `learning` si no hay o no es válido |
| `/scenario/...` | `learning` |
| `/chapter/...` | `grammar` |
| `/talk`, `/talk/open` | `talk` |
| `/shadow` | `shadow` |
| `/tools/...` | `tools` |

La parte del menú que usa `useSearchParams` va dentro de su propio `Suspense`, con el menú sin resaltar como respaldo.

**Por qué**: la guía (`layout.md`) indica que un diseño no puede leer la ruta, y que hay que hacerlo en un componente de cliente con `usePathname`.

## 4. Cómo se pregunta antes de salir (FR-011 a FR-016)

**Decisión**: un contexto `NavigationGuardProvider` dentro de `AppShell`, siguiendo el ejemplo "Blocking navigation" de la guía (`link.md`):

- Cada pantalla declara su trabajo pendiente con `useUnsavedWork(condición)`. El contexto guarda un conjunto de fuentes activas, así que varias pueden declararlo a la vez, y cada una se retira al cerrarse la pantalla.
- Las entradas del menú y de la ruta de migas son `Link` de Next con `onNavigate`. Si hay trabajo pendiente, cancelan la navegación con `preventDefault()` y abren el diálogo. Al elegir "Leave", se navega con `router.push`.
- Cerrar sesión pasa por la misma comprobación antes de llamar a `signOut`.
- Con trabajo pendiente, un oyente de `beforeunload` activa el aviso del navegador al recargar o cerrar la pestaña (FR-016).
- El diálogo usa el elemento nativo `<dialog>` con `showModal()`. "Stay" recibe el foco al abrir, y `Esc` equivale a quedarse.

**Por qué**: Next 16 no tiene un evento para bloquear cualquier navegación. `onNavigate` es la forma documentada de cancelarla desde un enlace, y solo se ejecuta en navegaciones dentro de la app, así que abrir en otra pestaña con `Cmd`+clic sigue funcionando sin preguntar, porque no se pierde nada. El `<dialog>` nativo da el foco atrapado y `Esc` sin dependencias nuevas.

**Descartado**:
- `window.confirm`: no se puede elegir "Stay" como opción predeterminada ni adaptarlo al aspecto de la app.
- Interceptar el botón Atrás del navegador: queda fuera del alcance (supuesto de la spec).
- Pasar el estado pendiente como una prop nueva de las fases: cambiaría su contrato (Principio V). El gancho se usa dentro de cada componente, y sus props y `onComplete()` no cambian.

## 5. Qué cuenta como trabajo pendiente en cada pantalla (FR-012)

Comprobado en el código actual de cada componente:

| Pantalla | Pendiente cuando |
|---|---|
| `ComprehensionPhase`, `ListeningPhase` | alguna respuesta escrita y aún no comprobada (`results === null`) |
| `PracticePhase` | alguna respuesta elegida o escrita y aún no comprobada |
| `SpeakingPhase` | grabando, o con transcripción sin evaluar, o evaluando (`loading`) |
| `ExpressionPhase`, `ChapterExpressionPhase` | evaluando, o con texto distinto del último enviado |
| Talk with AI (`app/talk/page.tsx`) | grabando, con transcripción sin enviar, enviando, o con al menos una respuesta del estudiante y sin la retroalimentación final |
| `ShadowSession` | en las etapas `words` o `final`, o guardando el resultado |
| Writing Assistant | con texto en el cuadro, o revisando |

**Peticiones en curso**: solo cuentan las que llevan el trabajo del estudiante: evaluar su respuesta, la réplica de la IA a su mensaje o guardar su resultado. Generar un audio, el tema de Talk o la oración de Shadowing no cuenta, porque al salir no se pierde nada suyo. Si contara, abrir Talk o Shadowing y salir enseguida pediría confirmación sin motivo, en contra de SC-003. Se ajustó en este sentido el caso límite de la spec.

**Talk recién abierto**: el tema y el primer mensaje de la IA se generan solos al entrar, así que la conversación cuenta como empezada solo desde la primera respuesta del estudiante.

**Fuera de la lista**: `ImmersionPhase` y `ExplanationPhase` solo reproducen audio. El cuadro del vocabulario flotante no es un módulo, conserva su texto al navegar porque vive en el diseño raíz, y no se incluye.

## 6. Audio y micrófono al salir

**Hallazgo**: `ImmersionPhase`, `ListeningPhase`, `ComprehensionPhase`, `ExplanationPhase` y `FinalSentenceStep` no tienen limpieza al cerrarse. `SpeakingPhase` y `FinalSentenceStep` tampoco detienen el reconocimiento de voz. Talk, `ShadowSession` y `WordRepeatStep` sí lo hacen.

**Decisión**: añadir a esos componentes un efecto de limpieza que pause el audio y aborte el reconocimiento de voz al cerrarse.

**Por qué**: hoy solo se sale de una lección con "← Dashboard" en la primera fase. Con el menú siempre a mano, salir a mitad de un diálogo dejaría el audio sonando en otro módulo, y el caso límite de la spec exige liberar el micrófono al salir.

## 7. Encabezado, nivel y cierre de sesión (FR-005)

**Decisión**: el encabezado del dashboard (marca, nombre, nivel con su selector y "Log out") pasa a `AppShell`. `AppShell` carga una vez el usuario, su nivel y la lista de niveles, y los comparte con un contexto `useAccount()`. El dashboard lee de ahí el nivel, y vuelve a cargar sus listas cuando cambia.

**Por qué**: hoy el dashboard carga el usuario y los niveles para su encabezado. Si ambos los cargaran, se duplicarían las consultas, y un cambio de nivel en el encabezado no llegaría al dashboard.

Las demás pantallas siguen leyendo el nivel por su cuenta, como hoy. Si se cambia de nivel dentro de Talk o Shadowing, el nuevo nivel se aplica al volver a abrirlos, y en las listas de inmediato, como dice el caso límite de la spec.

## 8. Ruta de migas y "← Dashboard" (FR-007 a FR-010)

**Decisión**: un componente `Breadcrumbs` con enlaces protegidos por el diálogo. Cada pantalla de módulo lo pone en lugar de "← Dashboard":

| Pantalla | Ruta de migas |
|---|---|
| Lección | `Learning path › <título>` |
| Capítulo | `Grammar › <título>` |
| Talk with AI | `Talk with AI › Practice your saved words`, o `Talk with AI › Bring any topic` en modo abierto |
| Shadowing | `Shadowing › Practice` |
| Writing Assistant | `Tools › Writing Assistant` |

En lecciones y capítulos, "← Back" se muestra solo desde la segunda fase. Al terminar la última fase, la lección lleva a `/dashboard?section=learning` y el capítulo a `/dashboard?section=grammar`. Los botones "Back to dashboard" de error también llevan a su sección.

Los nombres de Talk son los títulos de sus dos opciones en la sección del dashboard.

## 9. Espacio en pantalla y desplazamiento

**Decisión**:
- La página sigue desplazándose con la ventana; el menú es `sticky`, como hoy en el dashboard.
- Las pantallas de módulo dejan `min-h-screen` en su contenedor, porque `AppShell` ya ocupa la altura.
- La barra para responder de Talk, hoy `fixed inset-x-0 bottom-0`, se alinea con la columna de contenido a partir del ancho `md`, para no tapar el menú.
- Por debajo de `md`, el menú usa la fila horizontal que ya tiene hoy el dashboard.

**Por qué**: Talk calcula su desplazamiento automático con `window.scrollY` y `document.documentElement.scrollHeight`. Un contenedor interno con su propio desplazamiento lo rompería. Con un menú de 224 px, en 1280 px de ancho quedan unos 1000 px para el contenido, y las pantallas de módulo hoy usan como máximo `max-w-3xl` (768 px), así que caben sin desplazamiento horizontal (SC-007).

## 10. Otros detalles comprobados

- `SessionNotice` y `FloatingVocabulary` siguen en `app/layout.tsx`, por encima del grupo, y no cambian.
- Cada pantalla sigue comprobando la sesión y enviando a `/` si no la hay. `AppShell` no muestra el menú hasta tener usuario, para que no aparezca un instante sin sesión.
- `app/talk/open/page.tsx` reexporta `../page`. Al mover ambas carpetas juntas al grupo, la importación relativa sigue funcionando.
- No hay cambios de base de datos ni de rutas de API.
