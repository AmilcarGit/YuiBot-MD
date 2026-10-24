# Changelog

Todos los cambios importantes de YuiBot-MD se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sin publicar]

### Añadido
- **Pruebas automáticas** (`npm test`): 45 pruebas con `node:test` (permisos, subbots/PM2, base de datos, red, HTTP, canvas y handler). No necesitan instalar dependencias.
- **CI**: GitHub Actions ejecuta ahora las pruebas, además del chequeo de sintaxis, en Node 20 y 22.
- `CHANGELOG.md`, `.editorconfig` y `.nvmrc`.
- Metadatos del paquete (`repository`, `bugs`, `homepage`, `keywords`, `license`, `author`).
- `lib/http.js`: `crearFetchSeguro()` para crear variantes con otros tiempos de espera.

### Cambiado
- **README rediseñado** con banner, arquitectura, guías para Termux/VPS, tabla de comandos, configuración y solución de problemas, basado en el código real.

---

## Fase C — Robustez (2026-10-23)

### Añadido
- `lib/http.js`: `fetch` con timeout (30 s para recibir respuesta, 5 min de tope total) aplicado a 35 módulos.
- `lib/escrituraAtomica.js`: `crearAlmacenCacheado`, una caché que detecta cambios hechos por otros procesos.
- Opciones `LOG_MENSAJES` y `LOG_DEBUG` en `defaults.js`.

### Cambiado
- `usuarios.json` y `grupos.json` se leen con caché; `obtenerUsuario`/`obtenerGrupo` devuelven copias.
- Heartbeats de la red de subbots: un archivo por proceso (antes se pisaban en `heartbeats.json`).
- La lista de grupos del bot principal se escribe de forma atómica.
- `ultra-baileys` fijado al commit `2f1f2a4` (antes seguía a `#master`).
- El bot principal también se cierra limpio con `SIGTERM`.

> Al actualizar: ejecuta `npm install` y reinicia el bot principal **junto con** los subbots.

## Fase B — Correcciones (2026-10-23)

### Corregido
- `whitelist`, `apimanager` y `token` no cargaban (el nombre del archivo terminaba en espacio).
- Los comandos de subbots (`subbots`, `reloadsubbots`, `delsubbot`, `code`, `reiniciarmisubbot`, `apagarmisubbot`) reconocen ahora los nombres de proceso `subbot-N` y `yuibot-subbot-N`.
- `reconectar` apuntaba a la carpeta `sesion` (la real es `session`), leía una variable inexistente y, ejecutado desde un subbot, habría borrado la sesión del bot principal.
- `update` avisa si cambió `package.json` (hace falta `npm install`) y ya no dice "Reiniciando" cuando no se usa PM2.
- El bot principal solo procesaba el primer mensaje de cada lote de WhatsApp.
- Los avisos de antilink se acumulaban entre grupos; ahora se cuentan por grupo.
- Los subbots ahora responden cuando un comando falla.
- Los estados (`status@broadcast`) ya no llenan la consola.

### Añadido
- `lib/pm2.js` con utilidades de nombres de procesos.

## Corrección de compatibilidad — Termux/Android (2026-10-23)

### Cambiado
- `canvas` → `@napi-rs/canvas` mediante el adaptador `lib/canvas.js` (trae binarios para Android y no necesita compilar). Corrige `Cannot find module '../build/Release/canvas.node'`.
- `MARCAR_LEIDO` ahora es `false` por defecto (el bot ya no marca los mensajes con ✓✓ azul).

## Fase A — Seguridad de permisos (2026-10-23)

### Seguridad
- **Corregida una falla crítica**: dentro de un subbot, cualquier usuario pasaba los chequeos de owner/dueño (la identidad del propio bot se contaba siempre como remitente), lo que permitía usar `eval` y `exec`.
- `lib/permisos.js`: control de permisos centralizado con dos niveles — `ownerOnly` (solo owners del bot principal) y `subbotOwnerOnly` (owners o dueño de ese subbot).
- `eval` y `exec` se rechazan dentro de subbots.
- `delsubbot` verifica que quien lo pide sea owner o dueño de ese subbot.

### Cambiado
- Los comandos de autogestión de subbots pasan a `subbotOwnerOnly`.

> Si usabas `subbots` o `topsubbots` como dueño de un subbot, ahora quedan reservados al owner del bot principal.
