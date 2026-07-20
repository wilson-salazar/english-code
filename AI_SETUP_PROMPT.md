# Prompt para instalar English Code con una IA

Copia desde **INICIO DEL PROMPT** hasta **FIN DEL PROMPT** y entrégaselo a tu asistente de programación dentro de la carpeta clonada del proyecto.

---

## INICIO DEL PROMPT

Quiero instalar y ejecutar localmente este repositorio de English Code. Trabaja directamente en la carpeta actual y completa la instalación de principio a fin.

Objetivo final:

- La aplicación debe abrir en `http://localhost:3000`.
- Supabase debe ejecutarse localmente con Docker.
- Las migraciones y los datos iniciales deben estar cargados.
- Debe ser posible crear un usuario, iniciar sesión y ver las lecciones.
- La recuperación de contraseña local debe llegar a Mailpit en `http://127.0.0.1:54324`.

Sigue este procedimiento:

1. Lee completamente `README.md`, `package.json`, `.env.example` y `supabase/config.toml` antes de modificar o ejecutar nada.
2. Comprueba que estén disponibles Git, Node.js 20 o superior, npm y Docker. Si falta algo, indícame exactamente qué debo instalar y espera únicamente cuando sea imposible continuar sin mi intervención.
3. Verifica que Docker esté iniciado.
4. Ejecuta `npm install`.
5. Inicia Supabase con `npm run db:start`.
6. Ejecuta `npm run db:reset` para aplicar migraciones y cargar las lecciones iniciales.
7. Ejecuta `npx supabase status` y toma de allí `API_URL` y `PUBLISHABLE_KEY`.
8. Si `.env.local` no existe, créalo a partir de `.env.example`. Configura:
   - `NEXT_PUBLIC_SUPABASE_URL` con `API_URL`.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` con `PUBLISHABLE_KEY`.
9. No inventes, muestres ni publiques claves privadas. Si no existen `ANTHROPIC_API_KEY` o `ELEVENLABS_API_KEY`, explícame dónde obtenerlas y deja sus valores vacíos hasta que yo los proporcione. La navegación básica debe poder probarse sin esas dos funciones.
10. Ejecuta `npm run build` y corrige solamente errores relacionados con esta instalación. No cambies funcionalidades ni diseño sin consultarme.
11. Inicia la aplicación con `npm run dev`.
12. Comprueba `http://localhost:3000`, registra un usuario temporal y verifica que el dashboard muestre lecciones. Elimina el usuario temporal al finalizar si tienes acceso seguro para hacerlo.
13. Si pruebas recuperación de contraseña, abre Mailpit en `http://127.0.0.1:54324`; no esperes que el mensaje llegue a Gmail mientras Supabase sea local.
14. Al terminar, entrégame un resumen corto con:
   - Servicios iniciados y sus URLs.
   - Validaciones realizadas.
   - Variables o claves opcionales que siguen pendientes.
   - Comandos para detener y volver a iniciar el proyecto.

Reglas de seguridad:

- Nunca hagas commit de `.env.local`.
- Nunca pegues claves reales en `README.md`, `.env.example`, commits o mensajes públicos.
- No uses credenciales locales de Supabase en producción.
- No borres datos existentes ni ejecutes comandos destructivos sin explicar el impacto y pedirme autorización.

## FIN DEL PROMPT

