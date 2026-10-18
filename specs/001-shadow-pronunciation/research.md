# Investigación — Fase 0: Shadow (práctica de pronunciación)

## 1. Cómo determinar si una palabra fue "pronunciada correctamente"

**Decisión**: Usar el reconocimiento de voz del navegador (Web Speech API, ya usado en `SpeakingPhase` y
Talk with AI) en una instancia corta por palabra; normalizar (minúsculas, sin puntuación ni acentos) tanto
la palabra reconocida como la palabra objetivo, y compararlas por coincidencia exacta tras normalizar —
el mismo criterio de comparación simple ya usado en `PracticePhase.tsx` (`normalize(answer) ===
normalize(correctAnswer)`).

**Justificación**: No existe en la app ningún mecanismo de puntuación fonética/acústica (se confirmó que
no hay nada de ese tipo en `app/` ni `components/`); introducirlo implicaría un proveedor externo nuevo,
lo cual requiere justificación documentada (ver stack en la constitución) y no está pedido por el usuario.
La comparación por texto reconocido es consistente con cómo ya se evalúa el habla en el resto de la app y
cumple el principio de simplicidad por defecto.

**Alternativas consideradas**:
- Análisis fonético/acústico (p. ej. puntuación de pronunciación por fonema): más preciso, pero requiere
  un proveedor externo nuevo y procesamiento de audio en servidor — rechazado para v1 por complejidad y
  costo no justificados; el usuario ya anticipó que esta primera versión tendrá retoques posteriores.
- Coincidencia difusa (distancia de Levenshtein, tolerancia a variantes ortográficas del reconocimiento):
  reduciría falsos rechazos por errores menores de transcripción, pero añade una regla de negocio no
  pedida explícitamente — se deja como posible ajuste futuro, no como parte del v1.

## 2. Cómo reiniciar el reconocimiento de voz palabra por palabra

**Decisión**: Cada palabra dispara una nueva instancia corta de `SpeechRecognition` (no continua), que se
detiene automáticamente al obtener un resultado o tras un breve silencio — el mismo patrón ya usado para
respuestas de habla en `SpeakingPhase`/Talk with AI, pero reiniciado una vez por cada palabra de la oración
en lugar de una sola vez para toda la oración.

**Justificación**: Reutiliza una API y un patrón ya probados en producción; no se introduce ninguna
librería de reconocimiento de voz nueva.

**Alternativas consideradas**:
- Una sola sesión continua de reconocimiento para toda la oración, segmentando el resultado después:
  rechazada por ser más frágil para alinear qué parte del resultado corresponde a cada palabra.
- Enviar audio a un servicio de reconocimiento en servidor: rechazada por introducir un proveedor externo
  nuevo sin justificación de negocio, y por ir en contra de mantener los secretos y la complejidad al
  mínimo (Principio II).

## 3. Dónde vive el historial de práctica (FR-014)

**Decisión**: Nueva tabla `shadow_sessions` en `supabase/migrations/`, con RLS restringida al propio
usuario (mismo patrón que `user_progress`/`user_responses`), con un renglón por ejercicio completado
(oración, tema, nivel, fecha).

**Justificación**: Cumple el Principio III (RLS obligatoria) y sigue el patrón de datos ya existente en el
proyecto. Una tabla dedicada evita mezclar dos modelos de datos distintos.

**Alternativas consideradas**:
- Reutilizar `user_progress` con un tipo de registro genérico: rechazada porque esa tabla está pensada
  para el progreso de escenarios (fases, puntajes), no para un historial de práctica libre repetible, y
  mezclarlos complicaría las políticas RLS y las consultas del dashboard existentes.

## 4. Cómo generar la oración y el tema aleatorio

**Decisión**: Nueva ruta de servidor (`app/api/shadow/generate/route.ts`) que llama a Anthropic (mismo
SDK/modelo Haiku ya usado en `/api/talk`) para generar la oración y la categoría del tema, enviando el
nivel CEFR del estudiante y una lista de oraciones/temas recientes a evitar — el mismo patrón que
`previousTopics` en Talk with AI.

**Justificación**: Mantiene la llave de Anthropic solo en el servidor (Principio II) y reutiliza un patrón
ya validado en producción (variedad de temas, nivel acorde al estudiante, sin repetir lo reciente).

**Alternativas consideradas**:
- Lista estática de oraciones en el cliente: rechazada porque no cumpliría con la variedad de temas
  aleatorios pedida ni se adaptaría al nivel del estudiante como ya hace Talk with AI.

## 5. Reproducción de palabras sueltas y de la oración completa

**Confirmación** (no requirió una decisión nueva): la ruta existente `/api/tts` ya reproduce textos cortos
arbitrarios — hoy se usa para reproducir palabras sueltas de vocabulario y títulos de tema en Talk with AI.
Shadow reutiliza esa misma ruta tanto para cada palabra como para la oración completa, sin ningún cambio
en `/api/tts` ni en los IDs de voz.
