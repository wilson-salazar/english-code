# Lista de calidad de la especificación: Menú de navegación siempre visible

**Propósito**: validar que la especificación esté completa y tenga calidad antes de pasar a la planificación
**Creado**: 2026-11-13
**Funcionalidad**: [spec.md](../spec.md)

## Calidad del contenido

- [x] Sin detalles de implementación (lenguajes, frameworks, API)
- [x] Centrada en el valor para el usuario y las necesidades del negocio
- [x] Escrita para personas sin perfil técnico
- [x] Todas las secciones obligatorias completas

## Completitud de los requisitos

- [x] No quedan marcadores [NEEDS CLARIFICATION]
- [x] Los requisitos se pueden probar y no son ambiguos
- [x] Los criterios de éxito se pueden medir
- [x] Los criterios de éxito no dependen de la tecnología
- [x] Todos los escenarios de aceptación están definidos
- [x] Los casos límite están identificados
- [x] El alcance está claramente delimitado
- [x] Las dependencias y los supuestos están identificados

## Preparación de la funcionalidad

- [x] Todos los requisitos funcionales tienen criterios de aceptación claros
- [x] Los escenarios de usuario cubren los flujos principales
- [x] La funcionalidad cumple los resultados medibles de los criterios de éxito
- [x] No se filtran detalles de implementación en la especificación

## Notas

- Validada en una iteración, con 16 de 16 puntos correctos.
- La "dirección propia" de cada sección (FR-004) describe lo que ve el estudiante, que puede recargar sin perder la sección; no fija cómo se implementa.
- La confirmación al salir con trabajo sin guardar es decisión del dueño, del 2026-11-13.
- El dueño confirmó el 2026-11-13 los dos supuestos abiertos: las opciones de cuenta (cambiar de nivel y cerrar sesión) acompañan al menú en todas las pantallas, y el avance entre fases no cuenta como trabajo sin guardar.
- Durante el plan (2026-11-13) se precisó FR-012 y su caso límite: solo cuentan las peticiones con el trabajo del estudiante, y Talk cuenta como empezado desde su primera respuesta, para cumplir SC-003. Ver [research §5](../research.md).
