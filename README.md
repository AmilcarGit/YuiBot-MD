# YuiBot-MD

Bot de WhatsApp de AmilcarGit hecho con [Yui-Bails](https://github.com/AmilcarGit/Yui-Bails).

## Termux

```bash
pkg update && pkg install nodejs git -y
git clone https://github.com/AmilcarGit/YuiBot-MD
cd YuiBot-MD
npm install
cp .env.example .env
bash iniciar.sh
```

Al primer arranque escribe el número del bot con código de país y vincula el código que aparece en WhatsApp > Dispositivos vinculados.

### Descargas de video (`.ytmp4`)
El video se descarga con **yt-dlp** si está instalado en la misma máquina del bot (es lo más fiable). En Termux:

```bash
pkg install python ffmpeg
pip install -U yt-dlp
```

Sin yt-dlp el bot usa las APIs de Nexora y YOSOYO, que fallan a ratos. Los videos de más de 60 MB se rechazan.

## Railway

1. Sube el repositorio y crea un servicio desde GitHub.
2. Define las variables de `.env.example`, con `NUMERO_BOT` obligatorio.
3. Añade un volumen en `/app/alma` y `/app/data` para conservar la sesión y los datos.

## Estructura

- `yui.js` arranque
- `ajustes.js` configuración
- `nucleo/` conexión, cerebro, cargador, memoria, cola, sincronización y sub-bots
- `habilidades/` comandos con recarga en caliente
- `alma/` sesión de WhatsApp
- `data/` datos locales
- `temporal/` y `medios/` archivos temporales

## Base de datos oficial (Yui-Datos)

El bot viene conectado por defecto a la base oficial (`https://yuibot-datos.vercel.app`, código en [YuiBot-datos](https://github.com/AmilcarGit/YuiBot-datos)). Para usar tu propio despliegue pon `DATOS_URL=https://tu-proyecto.vercel.app` en el `.env`, o `DATOS_URL=off` para desactivarla. Conectado, el bot:

- se registra solo la primera vez y guarda sus credenciales en `data/datos.json` (no se sube al repo, no hay que poner claves en el `.env`);
- cada 2 minutos envía los cambios de los jugadores registrados (monedas, XP, racha, inventario, logros, trabajos). Los números se anonimizan en el servidor y no se envía el nombre;
- aparece en el ranking y el panel web, y `.top [xp|monedas|semana|trabajos]` y `.perfil` muestran los datos globales;
- si la API falla, el bot sigue funcionando con sus datos locales y reintenta sin duplicar nada.

**Yui en la web:** escribe `.web` al bot por privado, te da un código de 6 dígitos y con él entras en `TU_URL/yui` para usar los comandos (menu, perfil, daily, trabajar, tienda, gacha, ppt, ruleta, top…) con el mismo progreso. Lo que haces allí se refleja en WhatsApp (el bot lo consulta cada 10 minutos).

El dueño puede ver el estado con `.datos` y forzar una sincronización con `.datos ahora`. Con `DATOS_URL=off` el bot funciona solo con datos locales.

## Nueva habilidad

Crea un `.js` en `habilidades/` que exporte `nombre`, `alias`, `categoria`, `ayuda` y `ejecutar(sock, m, ctx)`. Opciones: `soloDueno`, `soloGrupo`, `soloPrivado`, `soloAdmin`, `registro`.

## Estilo y personalidad

Yui es una chica de anime y todo lo que dice sale de dos archivos que puedes editar sin tocar la lógica:

- `estilo/temas.js` letras (`script`, `negrita`, `mini`), emojis, marcos y festividades. Incluye `normal` y `navidad` (activa del 1 de diciembre al 6 de enero).
- `estilo/voz.js` todas las frases de Yui, con varias variantes para que no se repitan.

Para cambiar de estilo usa `TEMA` en `.env` (`auto`, `normal`, `navidad`) o, siendo dueño, `.tema navidad` desde WhatsApp. Para crear otra festividad copia el bloque `navidad` de `temas.js` y cambia su clave, fechas y emojis.

Pruebas: `npm test`.
