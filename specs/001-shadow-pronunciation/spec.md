# Especificación de la funcionalidad: Shadowing — práctica de pronunciación por repetición

**Rama de la funcionalidad**: `001-shadow-pronunciation`

**Creado**: 2026-10-17

**Estado**: Borrador

**Entrada**: Descripción del usuario: "Nuevo módulo 'Shadow' para entrenar la pronunciación mediante shadowing: la IA presenta y pronuncia una oración corta completa sobre un tema aleatorio (igual variedad de temas que Talk with AI), el estudiante inicia la práctica con un botón, la IA dice una palabra a la vez y el estudiante la repite viendo en un cuadro de texto lo que la IA dijo y lo que el sistema entendió que él dijo; si la pronunciación de una palabra está mal la IA la repite hasta que el estudiante acierte, y solo entonces avanza a la siguiente palabra; al terminar todas las palabras, el estudiante pronuncia la oración completa de corrido (igual que ya funciona en los demás módulos de habla) y el ejercicio termina ahí."

## Escenarios de usuario y pruebas *(obligatorio)*

### Historia de usuario 1 - Completar un ejercicio de shadowing (Prioridad: P1)

Como estudiante, quiero escuchar una oración corta en inglés y repetirla palabra por palabra, corrigiendo mi pronunciación en cada palabra antes de avanzar, y finalmente decir la oración completa de corrido, para practicar mi pronunciación de forma guiada.

**Por qué esta prioridad**: Es el flujo completo que define el valor del módulo; sin él no existe producto. Entregar solo esta historia ya constituye un MVP usable.

**Prueba independiente**: Se puede probar completamente iniciando un ejercicio, pronunciando cada palabra (bien o mal) hasta que el sistema avance, y terminando con la repetición de la oración completa; el ejercicio queda marcado como terminado.

**Escenarios de aceptación**:

1. **Dado** que el estudiante abrió el módulo Shadowing, **Cuando** la IA presenta y pronuncia la oración completa, **Entonces** el estudiante ve el texto de la oración y puede iniciar la práctica con un botón.
2. **Dado** que el estudiante inició la práctica, **Cuando** pronuncia correctamente la palabra que la IA acaba de decir, **Entonces** el sistema avanza automáticamente a la siguiente palabra.
3. **Dado** que el estudiante pronuncia una palabra de forma incorrecta, **Cuando** el sistema la evalúa, **Entonces** la IA repite esa misma palabra y el estudiante debe intentarlo de nuevo antes de avanzar.
4. **Dado** que el estudiante ya pronunció correctamente todas las palabras de la oración, **Cuando** llega al paso final, **Entonces** el sistema le pide pronunciar la oración completa de corrido y, al hacerlo, marca el ejercicio como terminado.

---

### Historia de usuario 2 - Practicar con oraciones y temas distintos (Prioridad: P2)

Como estudiante, quiero poder iniciar otro ejercicio de Shadowing con una oración y un tema diferentes justo después de terminar uno, para practicar varias veces seguidas sin fricción.

**Por qué esta prioridad**: Convierte el módulo en una herramienta de práctica repetible en vez de una demostración de una sola vez; aumenta el valor sin ser indispensable para que la primera versión funcione.

**Prueba independiente**: Se puede probar terminando un ejercicio y solicitando uno nuevo; se verifica que la oración y el tema sean distintos a los del ejercicio inmediatamente anterior.

**Escenarios de aceptación**:

1. **Dado** que el estudiante acaba de terminar un ejercicio de Shadowing, **Cuando** elige practicar de nuevo, **Entonces** el sistema presenta una oración nueva sobre un tema distinto al anterior.
2. **Dado** que el estudiante ha completado varios ejercicios seguidos, **Cuando** continúa practicando, **Entonces** no se le repite la misma oración dentro de esa sesión.

---

### Historia de usuario 3 - Ver retroalimentación visual de cada intento (Prioridad: P3)

Como estudiante, quiero ver en un cuadro de texto tanto la palabra que dijo la IA como lo que el sistema entendió que yo pronuncié, para poder comparar y corregir mi pronunciación por mi cuenta.

**Por qué esta prioridad**: Mejora la experiencia de aprendizaje (el estudiante entiende *por qué* una palabra fue rechazada), pero el ejercicio principal puede funcionar sin esta visibilidad detallada si hiciera falta simplificar una primera versión.

**Prueba independiente**: Se puede probar pronunciando una palabra y verificando que tanto el texto de la IA como el texto reconocido del estudiante aparezcan en pantalla inmediatamente después del intento.

**Escenarios de aceptación**:

1. **Dado** que el estudiante acaba de intentar pronunciar una palabra, **Cuando** el sistema evalúa el intento, **Entonces** el cuadro de texto muestra tanto la palabra objetivo como lo que el sistema reconoció del estudiante.
2. **Dado** que el estudiante tuvo varios intentos fallidos en la misma palabra, **Cuando** revisa el cuadro de texto, **Entonces** puede ver el historial de esos intentos previos para esa palabra.

---

### Casos límite

- ¿Qué pasa si el estudiante no concede permiso de micrófono o su dispositivo no tiene uno disponible?
- ¿Qué pasa si el navegador no soporta reconocimiento de voz (por ejemplo, Firefox de escritorio)?
- ¿Qué pasa si hay silencio o ruido de fondo y el sistema no reconoce ningún habla?
- ¿Qué pasa si el estudiante pronuncia una palabra completamente distinta a la esperada, no solo con acento marcado?
- ¿Qué pasa si el estudiante abandona el ejercicio a la mitad (navega a otra pantalla o cierra la app)?
- ¿Qué pasa si la generación de la oración falla o tarda demasiado (por ejemplo, error del servicio de IA)?

## Requisitos *(obligatorio)*

### Requisitos funcionales

- **FR-001**: El sistema DEBE generar una oración corta completa en inglés (aproximadamente 6 a 14 palabras) sobre un tema aleatorio (por ejemplo, tecnología, salud, psicología, vida cotidiana), acorde al nivel CEFR actual del estudiante, evitando repetir el mismo tema u oración usados recientemente.
- **FR-002**: El sistema DEBE reproducir en voz alta la oración completa antes de iniciar la práctica de shadowing.
- **FR-003**: El estudiante DEBE poder iniciar la práctica de shadowing mediante una acción explícita (botón) después de escuchar la oración completa.
- **FR-004**: Durante la práctica, el sistema DEBE presentar las palabras de la oración una por una, en orden, reproduciendo en voz alta cada palabra antes de que el estudiante la repita.
- **FR-005**: El sistema DEBE mostrar en pantalla, en todo momento, tanto la palabra pronunciada por la IA como lo que el sistema reconoció de la pronunciación del estudiante para esa palabra.
- **FR-006**: El sistema DEBE evaluar si lo que pronunció el estudiante corresponde a la palabra objetivo.
- **FR-007**: Si la pronunciación del estudiante no corresponde a la palabra objetivo, el sistema DEBE pedirle que la repita, reproduciendo nuevamente la palabra en voz alta, hasta un máximo de 3 intentos fallidos consecutivos para esa palabra.
- **FR-008**: Tras 3 intentos fallidos consecutivos en la misma palabra, el sistema DEBE ofrecer al estudiante la opción de saltar esa palabra o de escucharla pronunciada más despacio, antes de continuar con la oración.
- **FR-009**: El sistema DEBE avanzar a la siguiente palabra únicamente después de que la palabra actual se considere pronunciada correctamente, o después de que el estudiante use la opción de saltar de FR-008.
- **FR-010**: Una vez que todas las palabras de la oración se pronunciaron correctamente (o se saltaron) de forma individual, el sistema DEBE ofrecer al estudiante un paso final para pronunciar la oración completa de corrido, usando el mismo mecanismo de grabación y evaluación que ya existe en los demás módulos de habla de la aplicación.
- **FR-011**: El sistema DEBE marcar el ejercicio como terminado una vez completado el paso de la oración completa.
- **FR-012**: El estudiante DEBE poder iniciar un nuevo ejercicio de Shadowing con una oración y un tema diferentes justo después de terminar el anterior, sin límite de ejercicios por sesión.
- **FR-013**: El sistema DEBE solicitar permiso de micrófono al estudiante antes de iniciar la grabación, y comunicarle con claridad si el permiso fue denegado o el micrófono no está disponible.
- **FR-014**: El sistema DEBE registrar cada ejercicio de Shadowing que el estudiante complete (oración practicada, tema y fecha), protegido de forma que cada estudiante solo pueda ver su propio historial, de modo que se refleje en sus estadísticas de progreso del dashboard.

### Entidades clave

- **Ejercicio de Shadowing**: una oración objetivo en inglés con su tema/categoría y nivel CEFR asociado, junto con la lista ordenada de palabras que la componen.
- **Intento de palabra**: cada intento del estudiante de pronunciar una palabra específica del ejercicio; incluye lo que el sistema reconoció, si fue aceptado o no, y si la palabra terminó saltándose tras agotar los intentos.
- **Historial de práctica de Shadowing**: registro por estudiante de los ejercicios de Shadowing completados (oración, tema y fecha), usado para reflejar su progreso en el dashboard; visible únicamente para su propio dueño.

## Criterios de éxito *(obligatorio)*

### Resultados medibles

- **SC-001**: Un estudiante puede completar un ejercicio completo de Shadowing (oración inicial, repetición palabra por palabra y repetición final) en menos de 5 minutos para una oración de hasta 14 palabras.
- **SC-002**: El sistema nunca repite la misma oración ni el mismo tema en dos ejercicios consecutivos del mismo estudiante.
- **SC-003**: En el 100% de los intentos de pronunciación (aceptados o rechazados), el estudiante puede ver en pantalla tanto lo que la IA dijo como lo que el sistema entendió que él dijo, sin acciones adicionales de su parte.
- **SC-004**: Un estudiante nuevo puede iniciar y completar su primer ejercicio de Shadowing sin instrucciones externas, usando solo lo que ve en pantalla.
- **SC-005**: Un estudiante puede confirmar, desde su dashboard, cuántos ejercicios de Shadowing ha completado, sin necesidad de ayuda externa.

## Supuestos

- El nivel CEFR activo del estudiante (el mismo mecanismo que ya usa Talk with AI) determina la dificultad y el vocabulario de la oración generada.
- La determinación de "pronunciación correcta" se basa en si el reconocimiento de voz del navegador entiende que el estudiante dijo la palabra objetivo, siguiendo el mismo enfoque de evaluación por texto reconocido que ya usan las demás fases de habla de la aplicación — no se trata de un análisis fonético o acústico de la pronunciación.
- Shadowing es un módulo independiente, accesible desde el dashboard igual que Talk with AI, y no forma parte de la secuencia de fases de un escenario (immersion → listening → comprehension → speaking → expression).
- La reproducción en voz alta de palabras individuales y de la oración completa reutiliza la capacidad de texto a voz ya existente en la aplicación, que hoy ya reproduce textos cortos (por ejemplo, palabras sueltas de vocabulario).
- El estado de un ejercicio en curso (palabra actual, intentos) no necesita persistirse si el estudiante recarga la página a mitad del ejercicio; el ejercicio simplemente se reinicia. Solo los ejercicios completados quedan registrados en el historial de progreso (FR-014).
- El módulo no depende de completar ningún escenario previo; está disponible para cualquier estudiante autenticado en cualquier momento.
