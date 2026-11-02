# Investigación — Fase 0: Protección de la API y del acceso

Decisiones verificadas el 2026-11-01 contra el código, la guía de Next.js 16 en `node_modules/next/dist/docs/`, el código de `@supabase/auth-js` 2.108 y consultas de solo lectura a la base local.

## 1. Comprobar la sesión en cada ruta, no en `proxy`

**Decisión**: una función común en `lib/api-guard.ts`, llamada al inicio de cada una de las 7 rutas. Valida el token con `auth.getUser(token)`, usando un cliente de servidor sin persistencia ni renovación automática.

**Justificación**:
- La guía de autenticación de Next.js pide tratar los Route Handlers como puntos públicos y verificar ahí al usuario; `proxy` queda para comprobaciones optimistas, sin consultas pesadas.
- `getUser(jwt)` consulta el servicio de autenticación (`_getUser` en `GoTrueClient.js`), de modo que rechaza tokens alterados, vencidos o de usuarios eliminados.
- La función común también concentra el tamaño y el análisis del cuerpo, que dependen de cada ruta.

**Alternativas**:
- `proxy` con `matcher: /api/:path*`: protegería por defecto una ruta nueva, pero no resuelve los límites por ruta y va contra esa recomendación de la guía. FR-005 se cubre con la función común y una comprobación en el quickstart de que las 7 rutas la usan.
- `getClaims` (verificación local de la firma): evita la llamada, pero no detecta a un usuario eliminado. Con una base local, esa llamada es barata.

## 2. Clasificar el rechazo

**Decisión**:

| Caso | Respuesta |
|---|---|
| Sin token, token inválido o vencido, usuario inexistente | 401, `code: "session_expired"` |
| Sesión anónima (`user.is_anonymous`) | 401, `code: "session_expired"` |
| El servicio de autenticación no responde (`isAuthRetryableFetchError` o estado 5xx) | 503, `code: "session_unverified"` |

**Justificación**: FR-003 exige rechazar lo que no se pudo comprobar, y el caso límite pide no decir "venció" cuando en realidad no se pudo comprobar. El rechazo de sesiones anónimas es una segunda barrera: `enable_anonymous_sign_ins` ya está en `false`.

## 3. El cliente envía el token con una sola función

**Decisión**: `postJson(path, body, init?)` en `lib/api.ts` reemplaza las 16 llamadas a `fetch('/api/...')`:

1. `supabase.auth.getSession()`, que lee la sesión del navegador y la renueva si venció (`#__loadSession` en `GoTrueClient.js`).
2. Hace el POST con `Authorization: Bearer <token>`.
3. Si recibe 401, llama a `refreshSession()` y reintenta **una** vez (FR-007).
4. Si sigue en 401 o recibe 503 con `session_unverified`, emite un evento de ventana, y devuelve la respuesta sin más.

Devuelve un `Response` normal, así que cada pantalla conserva su lógica de `response.ok`, `.json()` y `.blob()`, y acepta `signal` para el tiempo máximo de Shadowing.

**FR-004 (otros sitios)**: el token vive en el almacenamiento del navegador, por origen, y no en cookies, así que una página de otro sitio no puede leerlo ni el navegador lo envía solo. Hoy `/api/tts` acepta una petición `text/plain` con `Origin` ajeno (comprobado); con la guarda, responde 401 antes de leer nada. No hacen falta tokens CSRF ni cabeceras CORS.

**Alternativa**: pasar la sesión a cookies con `@supabase/ssr`. Agrega una dependencia, reintroduce el riesgo de CSRF y cambia cómo inicia sesión toda la app. Descartada.

## 4. Aviso único de sesión vencida

**Decisión**: `components/SessionNotice.tsx`, montado en `app/layout.tsx` junto a `FloatingVocabulary`. Escucha el evento de `postJson`.
- Con `session_expired`, muestra una sola vez: "Your session has expired. Sign in to continue — your work on this page is safe.", con un pequeño formulario de correo y contraseña que llama a `signInWithPassword` sin salir de la pantalla.
- Con `session_unverified`, muestra: "We couldn't verify your session. Please try again.", sin formulario y descartable.
- Se oculta al recibir `SIGNED_IN` en `onAuthStateChange`. Como es un único estado en un único componente, varios audios fallidos no repiten el aviso.

**Justificación**: FR-009 pide conservar lo escrito. Volver a la pantalla de inicio desmontaría la pantalla y lo perdería.

**Alternativas**:
- Enlace a `/` en la misma pestaña: pierde el texto.
- Enlace en otra pestaña: conserva el texto y la sesión se compartiría en el navegador del Mac, pero en una app instalada en el iPhone, la etapa siguiente, otra ventana probablemente no comparte el almacenamiento (no verificado aquí).

## 5. Qué cambia en las 16 llamadas

| Archivo | Llamadas | Cambios además de usar `postJson` |
|---|---|---|
| `components/phases/SpeakingPhase.tsx` | 1 | **Corrección necesaria**: hoy hace `setFeedback(data)` sin mirar `res.ok`, así que un error llega a `feedback.scores.vocabulary` y rompe el render. Debe comprobar `res.ok`, mostrar un error y conservar la respuesta. |
| `components/phases/ExpressionPhase.tsx` | 1 | **Misma corrección**: además, hoy escribe en la base después de `setFeedback` y su `catch` es silencioso. |
| `components/phases/ChapterExpressionPhase.tsx` | 1 | **Misma corrección**. |
| `components/phases/ImmersionPhase.tsx`, `ExplanationPhase.tsx`, `ListeningPhase.tsx`, `ComprehensionPhase.tsx` | 4 | Solo audio; ya toleran `!res.ok`. |
| `components/shadow/ShadowSession.tsx` | 2 | Ya muestra `data.error` y tiene pantalla de reintento. |
| `components/shadow/WordRepeatStep.tsx`, `FinalSentenceStep.tsx` | 2 | Solo audio; ya toleran el fallo. |
| `components/FloatingVocabulary.tsx` | 1 | En segundo plano; ya ignora el error. |
| `app/talk/page.tsx` | 4 | Ya muestra `generated.error` y conserva la respuesta en `pendingHistory`, con "Retry AI response". |

**Consecuencia para los textos**: Talk y Shadowing muestran `error` tal como llega del servidor junto a su botón de reintento. Por eso el texto del 401 es una instrucción breve, "Sign in again, then retry.", que complementa al aviso global sin repetirlo.

## 6. Cerrar el registro sin perder datos

**Decisión**: en `supabase/config.toml`, `enable_signup = false` solo en `[auth]`. `[auth.email] enable_signup` se queda en `true`: el 2026-11-01 se comprobó que en `false` el servicio arranca con `GOTRUE_EXTERNAL_EMAIL_ENABLED=false` y rechaza todo inicio de sesión con correo (`email_provider_disabled`). Ya están cerrados: SMS (`enable_signup = false`), anónimas (`enable_anonymous_sign_ins = false`) y proveedores externos (ninguno activo). Hoy `/auth/v1/settings` devuelve `disable_signup: false`.

**Pasos**, en este orden:
1. Conteos por tabla de `public` y de `auth.users`, guardados para comparar.
2. Copia con el `pg_dump` **del contenedor**: el del Mac es la versión 14 y el servidor la 17.6, por lo que el del Mac no sirve. Destino: `~/Backups/english-code/`, que no está en el repositorio ni en iCloud (`~/Documents` sí está en iCloud; `~/Backups` no), con permisos `600`.
3. Verificar la copia con `pg_restore --list` del contenedor: debe incluir los datos de `auth.users` y de `public.users`. Si falla, **se detiene todo**.
4. Editar `config.toml`.
5. `npm run db:stop`, que conserva los volúmenes, y `npm run db:start`. **Nunca** `db:reset` ni `supabase stop --no-backup`, que según la ayuda de la CLI "Deletes all data volumes".
6. Repetir los conteos y comparar (SC-006). Si no coinciden, se detiene y se avisa al dueño.
7. Confirmar `disable_signup: true` en `/auth/v1/settings` **antes** de probar un registro directo, para que la prueba no pueda crear una cuenta.

**Riesgo reconocido**: no verifiqué en este proyecto un ciclo de parada y arranque con datos. Por eso la copia verificada y los conteos son obligatorios. El reinicio debe confirmarlo el dueño cuando llegue el momento.

**Interfaz**: `app/page.tsx` quita el modo `signup`, el paso de elegir nivel, el enlace "Create one" y `handleSignup`. Se conservan `login` y `forgot`. Restablecer la contraseña no crea cuentas.

**Instalación nueva**: quien clone el repositorio público ya no puede registrarse; el README explica cómo crear la cuenta desde Studio. El trigger `handle_new_auth_user` crea el perfil; sin metadatos, usa el nombre "Student" y deja `level_id` vacío, así que el README debe indicar cómo pasar `full_name` y `level_code` al crearla, o cómo elegir el nivel después. La cuenta actual no se ve afectada.

## 7. Límites por función

**Decisión**: ver [contracts/api-protection.md](./contracts/api-protection.md). Cada campo tiene un tope, y el cuerpo completo otro.

**Mediciones del contenido real**:

| Dato | Más largo hoy | Límite | Margen |
|---|---|---|---|
| Texto de una fase (`.text`, audio de lecciones y capítulos) | 1219 | 3000 | 2,4 veces |
| Línea de diálogo | 205 | 3000 | — |
| Mensaje de la IA guardado | 723 | 3000 | 4,1 veces |
| Respuesta del estudiante en Talk | 802 | 5000 | 6,2 veces |
| Respuesta guardada en evaluaciones | 461 | 5000 | 10,8 veces |
| `prompt` de lección / capítulo | 483 / 278 | 2000 | 4,1 veces |
| Título de escenario / capítulo | 39 / 38 | 200 | 5,1 veces |
| Palabra guardada | 17; la interfaz permite 120 | 120 | Igual a la interfaz |
| Título de tema | 55 | 200 | 3,6 veces |
| Mensajes en una conversación / caracteres totales | 25 / 8944 | Cuerpo de 1 MB | Muy holgado |

**Justificación**:
- **3000 caracteres en voz**: es la ruta que cobra por carácter. El techo real de un mensaje de la IA son los 700 `max_tokens` de la retroalimentación, unos 2800 caracteres (estimación de 4 por token).
- **5000 en respuestas**: 5 minutos de habla a 150 palabras por minuto son unas 750 palabras, cerca de 4000 caracteres; además coincide con el recorte que Talk ya aplica a cada mensaje.
- **1 MB en Talk**: el cliente envía la conversación completa y todos los títulos previos, y crecen con el uso; el servidor ya recorta a 20 mensajes y 80 títulos (FR-013). El costo lo limitan esos recortes, y el tope del cuerpo evita abusos de memoria.
- **Mensaje nuevo de más de 5000 en Talk**: hoy se recortaría sin aviso. La ruta rechaza el último mensaje del estudiante si supera el tope, para cumplir el escenario 3 de la Historia 4, y sigue recortando los anteriores.

## 8. Errores controlados

**Decisión**:
- `/api/tts` deja de devolver `detail` y lo registra en el servidor. También captura un fallo de red hacia el proveedor, hoy sin controlar.
- Las 3 evaluaciones envuelven la llamada en `try/catch`, registran el detalle y responden 500 con un error genérico. También rechazan un resultado sin `scores`: hoy devuelven `{}` con estado 200 si no hay JSON, y eso rompe la pantalla.
- Talk, Shadowing y la traducción ya controlan el fallo del proveedor y solo se ajustan a la guarda.

## 9. Servidor solo en el propio equipo

**Decisión**: en `package.json`, `next dev -H 127.0.0.1` y `next start -H 127.0.0.1`. La guía confirma que el valor predeterminado de `-H` es `0.0.0.0`.

**Justificación**:
- `start-dev.sh` y el arranque automático usan `npm run dev`, así que heredan el cambio.
- Se usa `127.0.0.1` y no `localhost` porque en este Mac `localhost` se resuelve a `::1` (comprobado), y una dirección explícita evita esa duda.

**A verificar en la implementación**: Next.js bloquea en desarrollo las peticiones a recursos internos desde orígenes distintos al `hostname` del servidor (`blockCrossSiteDEV`), y la guía indica `localhost` como valor por defecto. El dueño abre `http://localhost:3000`. Si aparece esa advertencia o falla la recarga en caliente, se agrega `allowedDevOrigins: ['localhost']` en `next.config.ts`.

**Consecuencia**: al terminar hay que reiniciar el servidor que ya corre (hoy lo levantó el arranque automático).

## 10. Límite de frecuencia

**Decisión**: no se agrega. Con registro cerrado y sesión obligatoria, solo el dueño puede llamar a las funciones, y el servidor ya no está en la red local. Se reabre si el uso real lo pide, por ejemplo si un error en el cliente provoca un bucle de llamadas.
