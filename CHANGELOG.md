# Changelog

Todos los cambios importantes de YuiBot-MD se documentan aquí.
El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

## [Sin publicar]

### Añadido
- **Fútbol en vivo** (`lib/futbol.js`, categoría nueva *Deportes*): `.marcador` (hoy, con lista desplegable de ligas), `.envivo`, `.tablaliga`, `.fixture` (por liga o equipo), `.infopartido` (goles, expulsiones, estadio), `.ligas` y **alertas automáticas** con `.seguirequipo` / `.dejarequipo` / `.misequipos`: el bot avisa en el chat el inicio, cada gol, rojas, descanso, goles anulados por VAR y el resultado final (`lib/alertasFutbol.js`, cada bot vigila solo lo suyo). 20 ligas y torneos con la API pública de ESPN, con caché de 30 s y reintentos. 19 pruebas con datos simulados (no se pudo consultar ESPN desde el entorno de desarrollo).
- **`.verunavez`** (`.vv`): al responder a una foto, video o audio de "ver una vez" lo reenvía como archivo normal y lo manda al privado de quien lo pidió (`vv aqui` lo deja en el chat; compatible con LID). Reconoce las tres envolturas de WhatsApp (V1, V2 y V2 Extension).
- **Correcciones**: el ayudante de deportes pasó a `lib/deportesUI.js` (el cargador ya no avisa "Módulo inválido"); `lib/futbol.js` reintenta con otros formatos de fecha si ESPN responde HTTP 400 y muestra el motivo; los avisos privados de tareas/exámenes/resumen usan el JID real (`lib/jids.js`).
- **`.tarea` interactiva**: lista desplegable de WhatsApp con tus pendientes (las más urgentes primero), tarjeta de cada tarea con botones ✅ Completar / 🗑️ Eliminar, botón de **copiar plantilla** y reacciones. Si WhatsApp rechaza listas o botones cae solo a botones y luego a texto (`enviarConRespaldo`). Las tareas con fecha **avisan solas** (el día anterior a las 18:00 y el mismo día a las 7:00, por privado y con botón para completar) y se cancelan al completarlas. `.tarea resumen on` envía cada mañana a las 7:00 un **resumen automático** con clases de hoy, tareas y exámenes de la semana (`lib/resumenDiario.js`). Los recordatorios ahora admiten botones. 9 pruebas nuevas.
- **Suite escolar** (`lib/escuela.js`, `lib/escuelaMate.js`): `.tarea` ahora **guarda** las tareas por persona (antes solo mostraba un aviso) con fecha de entrega opcional; `.misclases` (horario semanal), `.libreta` (notas por materia, pesos y promedio general; escala 0–20, aprueba con 11), `.promediar`, `.notaminima` (qué nota necesitas para llegar a tu meta), `.misexamenes` (cuenta regresiva y avisos por privado 1 día y 1 hora antes), `.pomodoro` y calculadoras `.ecuacion`, `.fraccion`, `.mcm`/`.mcd`, `.factorizar`, `.porcentaje`, `.unidades` y `.tablamult`. Se evitaron alias que son palabras comunes del chat. 18 pruebas. `caja()` ahora pone el borde en cada línea de filas multilínea.
- **Niveles y logros** (`lib/logros.js`): 14 logros con insignias (bronce, plata, oro, diamante) y premio en monedas, avisados automáticamente en el grupo al desbloquearse; `.logros` muestra el avance. La XP ahora guarda **racha de días** y **XP semanal**; `.topsemana` es el ranking de la semana (lunes a domingo, hora de Perú). Compartido entre el principal y los subbots. 9 pruebas.
- **Tarjeta de `.perfil` rediseñada**: panel de cristal, avatar con anillo de progreso de nivel, rango, barra de XP, posición global, mensajes/monedas/reputación/racha e insignias dibujadas. Sin emojis dentro de la imagen (no se ven en el canvas de Termux), ajusta nombres largos y funciona aunque falle el fondo o el avatar.
- **Rediseño visual**: nuevo `lib/estilo.js` (`caja`, `fila`, `negrita`, `versalitas`, `uso`…) y ~130 comandos con respuestas en cajas `╭━━〔 ✨ 𝗧𝗜́𝗧𝗨𝗟𝗢 〕━━⬣` con emojis. Los textos que se copian (códigos, tokens, enlaces, mayus/minus, salida de eval/exec) siguen limpios.
- **`.tts` gratis y sin API key** (`lib/tts.js`): 11 voces con nombre vía StreamElements (con respaldo en Google) y 12 idiomas vía Google; acepta texto citado; `.voces` muestra la lista. Se eliminó la dependencia de lempi. 6 pruebas.
- **Administración de grupos** (`lib/adminGrupo.js`): `.cerrar`/`.abrir`, `.linkgrupo` (`-r` restablece), `.nombregrupo`, `.descgrupo`, `.hidetag`, `.admins` y advertencias con `.warn`/`.unwarn`/`.warns` (expulsión automática al llegar al máximo, 3 por defecto). Solo admins u owners; los que cambian ajustes avisan si el bot no es admin. 9 pruebas.
- **Funciones únicas**: `.rep`/`.toprep` (reputación compartida entre el principal y los subbots; +1 por persona cada 24 h), `.afk` (avisa a quien te mencione o cite), `.recordar` (recordatorios persistentes, `30m`, `1h30m`, `2d`; los envía el mismo bot que los creó) y `.red` (latidos de todos los bots). El principal avisa por privado a los owners cuando un subbot se cae o se recupera (`lib/alertasRed.js`). Nuevos `lib/fechas.js`, `lib/recordatorios.js`, `lib/afk.js`, `lib/reputacion.js` y `listarUsuarios()` en `lib/db.js`. 11 pruebas.
- **Protección** (`lib/proteccion.js`): `.anticall` rechaza las llamadas y avisa (con `bloquear`, bloquea a quien insiste) y `.antiprivado` impide que usuarios normales usen comandos por privado (los owners y `.code` siguen funcionando). Los ajustes son **por bot**: el principal y cada subbot tienen los suyos (`data/proteccion.json`). Opciones en `PROTECCION` de `defaults.js`. 11 pruebas.
- **Interactivos nativos de WhatsApp**: `.encuesta` (encuesta real; `-m` permite varias respuestas), `.evento` (evento con fecha y hora de Perú), `.contacto` (tarjeta de contacto por número, mención o respuesta) y `.ubicacion` (coordenadas o enlace de Google Maps). `.pinterest` ahora envía las fotos como un **álbum**. Se corrigió `enviarAlbum` (usaba un formato que ultra-baileys no tiene). 11 pruebas.
- **Cola de envío anti-ban** (`lib/colaEnvio.js`, opción `ANTIBAN`): mantiene el orden de los mensajes de cada chat, los espacia con un poco de azar y separa los envíos entre chats; si un envío se cuelga se descarta para no bloquear el chat. Activa en el bot principal y en los subbots; se ve en `.healthbot`. 9 pruebas.
- Prueba automática `tests/comandos.test.js`: ningún comando puede repetir el nombre o alias de otro (el cargador se queda en silencio con el último). Revisión actual: 161 comandos, sin duplicados.
- **8 comandos nuevos**: `.pokemon` (Pokédex), `.anime` (MyAnimeList), `.divisa` (conversor de monedas), `.cripto` (precios), `.pais` (datos de un país), `.bola8`, `.ppt` (piedra, papel o tijera) y `.ship` (compatibilidad). Los primeros cinco usan APIs públicas gratuitas sin key (`lib/publicas.js`); los otros tres no necesitan internet. 10 pruebas nuevas.
- `lib/reintentar.js`: `.sticker` y `.stickerly` reintentan hasta 3 veces cuando WhatsApp rechaza la subida (`Media upload failed on all hosts`, error 500) y avisan con un mensaje claro si no se logra.
- Delirius reintenta hasta 3 veces los fallos de conexión (timeouts, 5xx) y el error indica la causa en lugar de `fetch failed`.
- **Comandos nuevos con Delirius** (gratis, sin token): `.letra` (letras de canciones), `.spotify` (busca en Spotify y envía el audio), `.soundcloud` (busca y descarga; requiere yt-dlp), `.ss` (captura de una página web).
- `.ia`, `.stickerly` y `.pinterest` ahora usan Delirius (la IA ya no depende de lempi; `.pinterest` conserva la API anterior de respaldo). 10 pruebas nuevas con las respuestas reales de la API.
- **Delirius como API de respaldo** (gratis, sin token) para YouTube (audio, video, búsqueda), TikTok, Instagram y Facebook, en lugar de lempi y dv-yer. Nuevo `lib/delirius.js` con 6 pruebas. `.facebook` también usa Delirius si yt-dlp falla.
- **TikTok, Instagram y Facebook sin APIs externas**: `.tiktok` y `.instagram` usan yt-dlp primero (API de respaldo) y hay un comando nuevo `.facebook` (`.fb`) para videos públicos. La opción `YOUTUBE` de `defaults.js` pasa a llamarse `DESCARGAS` y admite `COOKIES` (ruta a un `cookies.txt`) para los sitios que piden iniciar sesión.
- **Descargas de YouTube sin APIs externas**: `.play`, `.ytv` (ahora también `.video`) y la búsqueda usan **yt-dlp** instalado en tu equipo (`pkg install yt-dlp ffmpeg` en Termux), con la API anterior como respaldo. Opciones en `YOUTUBE` de `defaults.js` (`MODO`, `MAX_MB`, `ALTURA`). Se agregan 7 pruebas con un yt-dlp simulado.
- **Menú en un solo mensaje**: `.menu` envía imagen/gif y una cajita desplegable «📂 Abrir menú» con todos los comandos por categoría; al tocar uno se ejecuta. Opción `MENU_LISTA` (false = menú clásico). Si la lista falla, baja a botones y luego a texto.
- **Menú Plus** (`.menu`): portada compacta con perfil (nivel, rango, monedas), estado del bot e índice de las 16 categorías; botones de acceso rápido; `.menu <categoría>` (acepta alias como `juegos` o `descargas`), `.menu <palabra>` para buscar, `.menu <comando>` para ver su ficha, y `.menu todo` repartido en varios mensajes. Solo muestra los comandos que puedes usar, sugiere "¿quisiste decir…?" y cae a texto simple si fallan los botones o el medio. Opción `MENU_BOTONES` en `defaults.js`.
- **Pruebas automáticas** (`npm test`): 60 pruebas con `node:test` (permisos, subbots/PM2, base de datos, red, HTTP, canvas y handler). No necesitan instalar dependencias.
- **CI**: GitHub Actions ejecuta ahora las pruebas, además del chequeo de sintaxis, en Node 20 y 22.
- `CHANGELOG.md`, `.editorconfig` y `.nvmrc`.
- Metadatos del paquete (`repository`, `bugs`, `homepage`, `keywords`, `license`, `author`).
- `lib/http.js`: `crearFetchSeguro()` para crear variantes con otros tiempos de espera.

### Cambiado
- `.votacion` conserva su nombre y su funcionamiento, pero cede los alias `encuesta` y `poll` a la nueva encuesta nativa (`.encuesta`).
- `BYE_ENABLED` no estaba definido, por eso la despedida de grupos nunca se enviaba; ahora está en `true` por defecto.
- Se quitaron alias que son palabras comunes del español (`precio`, `cambio`, `moneda`, `mal`, `bola`, `pareja`, `letras`, `comandos`), porque el bot acepta comandos sin prefijo y se activaban por accidente al escribir normal.
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
