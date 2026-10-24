# Cómo contribuir

Gracias por ayudar a mejorar este proyecto.

## Antes de empezar

1. Lee el README y revisa los Issues abiertos.
2. Para cambios grandes, abre primero un Issue y acuerda el enfoque.
3. No incluyas credenciales, tokens, números privados ni archivos de sesión.

## Cambios de código

- Mantén los cambios centrados en el problema.
- Conserva el comportamiento existente salvo que la tarea requiera cambiarlo.
- Sigue el estilo y las herramientas que ya utiliza el repositorio.
- No añadas dependencias sin explicar por qué son necesarias.
- Actualiza la documentación si cambian la instalación, configuración o los comandos.

## Pruebas

Ejecuta `npm run check` (sintaxis), `npm test` (pruebas automáticas) y, con las dependencias instaladas, `npm run smoke` (carga de módulos y nombres duplicados). Si corriges un bug o añades lógica en `lib/`, añade una prueba en `tests/` que falle sin tu cambio. En el PR, indica exactamente qué ejecutaste y si pasó. No declares pruebas que no hayas realizado.

## Pull requests

Describe el problema, el enfoque, los pasos de prueba, los riesgos y los cambios de documentación. Los mantenedores revisarán el código antes de integrarlo.
