# Guía de validación — Protección de la API y del acceso

Pasos para comprobar la spec ([spec.md](./spec.md)) de principio a fin. No sustituye al Principio VI: `npx tsc --noEmit`, `npm run lint` y `npm run build`, obligatorio aquí porque se tocan rutas y configuración.

## Estado de la verificación (2026-11-01)

| Escenario | Estado | Quién | Lo comprobado |
|---|---|---|---|
| 1. Sin sesión | Verificado | Claude | Las 7 rutas responden 401 sin token y con un token inventado |
| 2. Con sesión | Parcial | Dueño, con registros revisados por Claude | `/api/talk` y `/api/tts` responden 200 y Talk guarda los mensajes. Falta el recorrido de los 5 módulos (T030) |
| 3. Sesión vencida | Parcial | Claude | El aviso aparece una sola vez al simular el evento. Faltan su formulario y la renovación real (T031) |
| 4. Entradas grandes | Pendiente | Dueño | T040 |
| 5. Registro cerrado | Parcial | Claude | Registro y sesión anónima rechazados, conteos iguales en dos reinicios y `auth.users` en 1. El dueño inició sesión con su contraseña. Falta revisar su progreso y sus palabras, y el correo de recuperación (T058) |
| 6. Solo en el equipo | Parcial | Claude | Pasos 1 a 3: `127.0.0.1:3000`, `localhost` responde, recarga en caliente sin recargar la página y sin advertencias de origen. Desde el propio Mac, la IP de red no conecta. El dueño vio "no se puede conectar al servidor" en el iPhone, sin confirmar en qué dirección ni desde qué red. El arranque automático no está instalado (T063) |
| 7. Errores internos | Pendiente | Dueño | T047 |
| Dependencia: base en la red | Sin resolver, prueba aplazada por el dueño | Claude | El puerto 54323 escucha en `*` y el firewall sigue apagado. No se comprobó si un equipo de la red llega a él (T064) |

## Prerrequisitos

- Supabase local corriendo. **Nunca** `npm run db:reset` ni `supabase stop --no-backup`.
- Copia de seguridad verificada y conteos guardados (escenario 5, pasos 1 a 3), **antes** de reiniciar servicios.
- Sesión iniciada con la cuenta del dueño en el navegador.

Las peticiones de estos escenarios **sin sesión o con un cuerpo no válido** no gastan créditos: se rechazan antes de llamar al proveedor. Si alguna responde 200 con audio o con contenido de IA, es un fallo: anótalo.

## Escenario 1 — Sin sesión no se gastan créditos (Historia 1, P1)

1. Comprobar que las 7 rutas usan la guarda:

   ```bash
   grep -L "guardRequest" app/api/*/route.ts app/api/*/*/route.ts
   ```

   No debe listar ningún archivo.
2. Enviar a cada una de las 7 rutas un POST sin `Authorization`, con el cuerpo `{}`. Esperado: 401 con `code: "session_expired"` en todas.
3. Repetir con `Authorization: Bearer token-inventado`. Esperado: 401.
4. Con una petición `text/plain` y `Origin: https://evil.example` a `/api/tts`, sin token. Esperado: 401 (FR-004, SC-003).
5. Revisar en el registro del servidor que no hubo llamadas a proveedores.

## Escenario 2 — Con sesión, todo sigue igual (Historia 2, P1)

Recorrer un flujo de cada módulo y confirmar que no aparece ningún paso nuevo (SC-002):

1. **Lección**: audio de immersion, listening y comprehension; evaluación hablada en speaking y escrita en expression.
2. **Capítulo**: audio de la explicación y evaluación del ejercicio escrito.
3. **Shadowing**: ejercicio completo, con generación y audio.
4. **Talk with AI**: abrir tema, responder y pedir la retroalimentación, en los dos modos.
5. **Vocabulario**: guardar una palabra y confirmar que aparece su significado en español.
6. Confirmar que el audio y la conversación no se notan más lentos.

## Escenario 3 — Sesión vencida (Historia 2 y casos límite)

Para simularla: en las herramientas de desarrollo, borrar del almacenamiento local la entrada `sb-*-auth-token`, sin recargar.

1. **Evaluación**: escribir una respuesta en expression y enviarla. Esperado: aviso con formulario de inicio de sesión, y la respuesta intacta. Iniciar sesión ahí mismo y volver a enviar: llega la evaluación.
2. **Talk**: enviar una respuesta. Esperado: el aviso, la respuesta conservada y "Retry AI response". Tras iniciar sesión, reintentar sin escribir de nuevo.
3. **Audio**: entrar en una fase con varios audios. Esperado: el texto visible, y **un solo** aviso.
4. **Renovación (FR-007)**: dejar la app abierta más de una hora, el tiempo de `jwt_expiry`, y usar una función. Esperado: responde sin aviso.
5. **Servicio de autenticación caído**: si se puede detener solo ese contenedor sin tocar la base, pedir una función. Esperado: 503 y el mensaje de que no se pudo comprobar la sesión, sin el de sesión vencida. **No detener la base para esta prueba.**

## Escenario 4 — Entradas demasiado grandes (Historia 4, P2)

Se necesita un token válido. Si un límite no funcionara, esa petición llegaría al proveedor y gastaría créditos, así que conviene excederlo por poco y probar una ruta a la vez.

1. Enviar con sesión a cada ruta un campo que supere su límite ([contrato](./contracts/api-protection.md)). Esperado: 413, sin llamada al proveedor.
2. Enviar `{` como cuerpo, y un `text` que sea un número. Esperado: 400.
3. **Sin falsos rechazos (SC-004)**: reproducir el texto más largo de una lección (1219 caracteres en la medición del plan). Esperado: suena. Enviar a evaluar una respuesta de 4500 caracteres. Esperado: se acepta.
4. **Talk**: enviar una respuesta de más de 5000 caracteres. Esperado: un error claro, y el texto intacto en el cuadro.

## Escenario 5 — Registro cerrado y datos intactos (Historia 3, P2)

1. Guardar conteos por tabla (solo lectura), incluida `auth.users`.
2. Hacer la copia con el `pg_dump` del contenedor, no el del Mac, en `~/Backups/english-code/`, con permisos `600`.
3. Verificarla con `pg_restore --list` del contenedor: debe incluir los datos de `auth.users` y `public.users`. Si falla, **detenerse**.
4. Aplicar `enable_signup = false`, y ejecutar `npm run db:stop` y `npm run db:start`.
5. Repetir los conteos y comparar (SC-006). Si no coinciden, detenerse.
6. Confirmar que `/auth/v1/settings` devuelve `disable_signup: true`. **Solo entonces**, intentar un registro directo contra `/auth/v1/signup`. Esperado: rechazado.
7. Confirmar que `auth.users` sigue con exactamente 1 cuenta (SC-005).
8. Abrir la pantalla de inicio. Esperado: sin "Create one".
9. Iniciar sesión con la cuenta del dueño y comprobar que su progreso y sus palabras siguen ahí.
10. Pedir el restablecimiento de contraseña hasta el correo en el buzón local, **sin** cambiar la contraseña salvo que el dueño quiera. Esperado: el correo llega.

## Escenario 6 — Servidor solo en el propio equipo (Historia 5, P2)

1. Reiniciar el servidor con `npm run dev`.
2. Confirmar la dirección de escucha:

   ```bash
   lsof -nP -iTCP:3000 -sTCP:LISTEN
   ```

   Esperado: `127.0.0.1:3000`, no `*:3000`.
3. Abrir `http://localhost:3000` en el Mac. Esperado: funciona, sin advertencias de origen en la consola del servidor y con recarga en caliente.
4. Desde el iPhone, por Wi-Fi, abrir `http://<IP del Mac>:3000`. Esperado: no conecta (SC-007).
5. Tras un reinicio del Mac, confirmar que el arranque automático deja el servidor en `127.0.0.1:3000`.

## Escenario 7 — Errores sin detalles internos (Historia 6, P3)

1. Con la llave de ElevenLabs inválida temporalmente en `.env.local`, y el servidor reiniciado, pedir audio. Esperado: un error genérico, y el detalle solo en el registro del servidor. **Restaurar la llave al terminar.**
2. Lo mismo con la llave de Anthropic en una evaluación. Esperado: un mensaje claro en pantalla, la respuesta conservada y nada escrito en la base.

## Dependencia — Base de datos abierta a la red

Fuera del alcance, pero sin esto el conjunto no queda protegido. Desde el iPhone, por Wi-Fi, abrir `http://<IP del Mac>:54323`. Esperado: no conecta. Si abre, hay que resolverlo antes de la etapa siguiente.
