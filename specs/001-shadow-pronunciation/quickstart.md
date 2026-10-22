# Guía de validación — Shadowing (práctica de pronunciación)

Pasos para comprobar manualmente que el módulo cumple el spec ([spec.md](./spec.md)) de principio a fin.
No sustituye al Principio VI (`tsc --noEmit`, `npm run lint`, `npm run build` si aplica).

## Prerrequisitos

- Supabase local corriendo (`npx supabase status`; si no, `npx supabase start`).
- `.env.local` con `ANTHROPIC_API_KEY` y `ELEVENLABS_API_KEY` configuradas (ver [README.md](../../../README.md)).
- Sesión iniciada en la app con un usuario de prueba que tenga un nivel CEFR asignado.
- Migración de `shadow_sessions` aplicada (ver [data-model.md](./data-model.md)) vía `psql` incremental,
  según la convención del proyecto (nunca `supabase db reset`).

## Escenario 1 — Flujo completo de un ejercicio (Historia de usuario 1, P1)

1. `npm run dev` y abrir el módulo Shadowing desde el dashboard.
2. Confirmar que se presenta una oración corta en inglés y que se reproduce en voz alta completa antes de
   poder iniciar la práctica (FR-001, FR-002).
3. Pulsar el botón de inicio y confirmar que la IA pronuncia la primera palabra.
4. Pronunciar la palabra correctamente → confirmar que el sistema avanza solo a la siguiente palabra
   (FR-006, FR-009) y que el cuadro de texto muestra tanto lo dicho por la IA como lo reconocido del
   estudiante (FR-005, SC-003).
5. En otra palabra, pronunciar algo incorrecto intencionalmente 3 veces seguidas → confirmar que tras el
   tercer intento fallido aparece la opción de saltar / oír más despacio (FR-007, FR-008).
6. Terminar todas las palabras → confirmar que se ofrece el paso final de repetir la oración completa, con
   el mismo mecanismo de grabación/evaluación ya usado en los demás módulos de habla (FR-010).
7. Completar el paso final → confirmar que el ejercicio se marca como terminado (FR-011).
8. Verificar en la base local (`psql` de solo lectura) que se insertó exactamente un renglón en
   `shadow_sessions` para este ejercicio, con el `user_id` del estudiante de prueba (FR-014).

**Tiempo esperado**: todo el escenario en menos de 5 minutos para una oración de hasta 14 palabras (SC-001).

## Escenario 2 — Práctica continua con temas distintos (Historia de usuario 2, P2)

1. Al terminar el Escenario 1, elegir "practicar de nuevo".
2. Confirmar que la nueva oración y su tema son distintos a los del ejercicio anterior (FR-012, SC-002) —
   ver el contrato de [`POST /api/shadow/generate`](./contracts/shadow-generate-api.md).
3. Repetir 2–3 veces más y confirmar que ninguna oración se repite dentro de la misma sesión.

## Escenario 3 — Progreso visible en el dashboard (FR-014, SC-005)

1. Completar al menos un ejercicio de Shadowing (Escenario 1).
2. Abrir el dashboard y confirmar que el conteo de ejercicios de Shadowing completados por el estudiante es
   visible, sin ayuda externa.
3. Iniciar sesión con un segundo usuario de prueba y confirmar que **no** puede ver el historial de Shadowing
   del primer usuario (RLS, Principio III).

## Casos límite a probar manualmente

Ver la sección "Casos límite" del [spec.md](./spec.md#casos-límite): sin permiso de micrófono, navegador
sin soporte de reconocimiento de voz, silencio/ruido de fondo, palabra totalmente distinta a la esperada,
abandono a mitad del ejercicio, y fallo o demora en la generación de la oración.
