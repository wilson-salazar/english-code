# Modelo de datos — Protección de la API y del acceso

**Sin tablas, columnas, migraciones ni políticas nuevas.** RLS sigue activa en las 16 tablas (comprobado el 2026-11-01). Este documento describe los estados y valores que la funcionalidad maneja sin guardarlos en la base.

## Sesión en la petición

No se persiste nada nuevo: es la sesión que Supabase Auth ya guarda en el navegador.

| Estado | Cómo se determina en el servidor | Resultado |
|---|---|---|
| Válida | `getUser(token)` devuelve un usuario no anónimo | Sigue la petición |
| Ausente | No hay cabecera `Authorization: Bearer` | 401 `session_expired` |
| Inválida | `getUser` responde error de autenticación | 401 `session_expired` |
| Anónima | `user.is_anonymous` es verdadero | 401 `session_expired` |
| No comprobable | Fallo de red o 5xx del servicio de autenticación | 503 `session_unverified` |

## Estado del aviso en el cliente (`SessionNotice`)

```text
oculto ── evento session_expired ──▶ pide iniciar sesión
pide iniciar sesión ── SIGNED_IN ──▶ oculto
oculto ── evento session_unverified ──▶ aviso descartable
aviso descartable ── descartar o SIGNED_IN ──▶ oculto
```

Un evento recibido mientras ya se muestra el aviso no cambia nada, salvo que `session_expired` reemplaza a `session_unverified`. Así el aviso aparece una sola vez por episodio (FR-008).

## Configuración

| Valor | Archivo | Antes | Después |
|---|---|---|---|
| `[auth] enable_signup` | `supabase/config.toml` | `true` | `false` |
| `[auth.email] enable_signup` | `supabase/config.toml` | `true` | Sin cambio: en `false` también desactiva el inicio de sesión con correo (comprobado el 2026-11-01) |
| `[auth] enable_anonymous_sign_ins` | `supabase/config.toml` | `false` | Sin cambio |
| `[auth.sms] enable_signup` | `supabase/config.toml` | `false` | Sin cambio |
| Script `dev` | `package.json` | `next dev` | `next dev -H 127.0.0.1` |
| Script `start` | `package.json` | `next start` | `next start -H 127.0.0.1` |

## Datos que se deben conservar (FR-018, SC-006)

Antes y después de reiniciar los servicios se cuentan los registros de `auth.users` y de todas las tablas de `public`. La regla es: al terminar, cada tabla tiene al menos los mismos registros, y `auth.users` tiene exactamente 1.

La copia de seguridad (`pg_dump`) contiene datos personales y hashes de contraseña; se guarda en `~/Backups/english-code/` con permisos `600`, fuera del repositorio y de iCloud.
