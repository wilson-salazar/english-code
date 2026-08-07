# English Code — Manual de usuario

English Code es una app para aprender inglés enfocada en desarrolladores y QA:
enseña el vocabulario y las expresiones que realmente se usan en standups,
reportes de bugs, revisiones de código y entrevistas técnicas.

## ¿Dónde se usa?

Por ahora la aplicación corre en modo local (aún no tiene una URL pública en
internet). Para usarla:

1. Alguien con el repositorio clonado ejecuta `npm run dev` en su computador
   (ver [README.md](./README.md) para la instalación completa).
2. Se abre en el navegador: **http://localhost:3000**

> Cuando se publique una versión en internet con una URL fija, esta sección se
> actualizará con esa dirección.

## Primeros pasos

1. **Crear una cuenta**: en la pantalla de inicio, toca "Create one", ingresa
   tu nombre, correo y una contraseña de al menos 8 caracteres.
2. **Elige tu nivel de inglés**: A2 (básico), B1 (pre-intermedio), B2
   (intermedio) o C1 (avanzado). Puedes cambiarlo después desde el dashboard.
3. Si ya tienes cuenta, inicia sesión con "Sign in". Si olvidaste tu
   contraseña, usa "Forgot password?" para recibir un enlace de recuperación.

## El Dashboard

Al entrar verás tres vistas:

- **Learning**: la lista de escenarios (lecciones) de tu nivel, en orden. Cada
  escenario se desbloquea al completar el anterior. Aquí también ves tu
  progreso y tu puntaje por escenario.
- **Talk**: conversaciones libres por voz con la IA (ver más abajo).
- **Progress**: tus estadísticas — escenarios completados, palabras
  aprendidas, promedio de vocabulario, claridad y naturalidad, y racha de
  días activo.

## Cómo funciona una lección (escenario)

Cada escenario tiene varias fases que se completan en orden:

1. **Immersion (Inmersión)** — lees un texto del escenario (por ejemplo, un
   hilo de Slack o un reporte de bug) con palabras clave resaltadas. Puedes
   tocar el ícono de altavoz para escuchar la pronunciación.
2. **Listening (Escucha)** — escuchas un diálogo entre dos personas (voces de
   Adam y Jessa). Mientras se reproduce, el texto va apareciendo en pantalla
   como subtítulos, por si necesitas leer para entender mejor. Luego respondes
   preguntas de comprensión sobre lo que escuchaste.
3. **Comprehension (Comprensión)** — respondes preguntas en inglés sobre lo
   leído. Cada pregunta tiene su propio ícono de altavoz para escucharla en
   voz de Jessa si prefieres oírla antes de responder.
4. **Speaking (Habla)** — grabas tu voz respondiendo un prompt (usa el
   micrófono del navegador) y recibes retroalimentación de una IA sobre
   vocabulario, fluidez y naturalidad.
5. **Expression (Expresión escrita)** — escribes una respuesta más elaborada
   en inglés y recibes retroalimentación de la IA con una versión mejorada de
   tu texto.

Al terminar todas las fases, el escenario queda marcado como completado y se
desbloquea el siguiente.

## Talk with AI (conversación libre)

Desde la vista "Talk" del dashboard puedes tener una conversación por voz con
la IA usando hasta 10 de tus palabras guardadas. La IA elige un tema, ustedes
conversan por turnos (hasta 5 turnos tuyos) y al final recibes un resumen con
tus fortalezas, qué mejorar y un siguiente paso sugerido.

## Lista de vocabulario personal

En la mayoría de las pantallas verás un widget flotante para guardar palabras
o frases nuevas que quieras recordar. Cada término guarda automáticamente su
significado en español, y puedes marcarlo como aprendido cuando ya lo
domines. Estas palabras son las que se usan en las conversaciones de "Talk
with AI".

## Preguntas frecuentes

**¿Necesito internet?**
Sí, la app usa servicios en la nube (Supabase, Anthropic, ElevenLabs) para
guardar tu progreso, evaluar tus respuestas y generar el audio.

**¿Por qué no escucho audio en algunas partes?**
El audio (diálogos, preguntas, pronunciación) depende de una clave de
ElevenLabs configurada por quien instaló la app. Si no está configurada, esas
partes funcionan igual pero sin sonido.

**¿Mis datos son privados?**
Sí. Cada usuario solo puede ver su propio progreso, respuestas y vocabulario
(protegido con Row Level Security en la base de datos).
