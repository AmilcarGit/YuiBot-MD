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

## Base de datos oficial

Con `DATOS_URL` apuntando a tu despliegue de YuiBot-datos, el bot sincroniza cada 2 minutos. Sin ella funciona solo con los datos locales.

## Nueva habilidad

Crea un `.js` en `habilidades/` que exporte `nombre`, `alias`, `categoria`, `ayuda` y `ejecutar(sock, m, ctx)`. Opciones: `soloDueno`, `soloGrupo`, `soloPrivado`, `soloAdmin`, `registro`.

## Estilo y personalidad

Yui es una chica de anime y todo lo que dice sale de dos archivos que puedes editar sin tocar la lógica:

- `estilo/temas.js` letras (`script`, `negrita`, `mini`), emojis, marcos y festividades. Incluye `normal` y `navidad` (activa del 1 de diciembre al 6 de enero).
- `estilo/voz.js` todas las frases de Yui, con varias variantes para que no se repitan.

Para cambiar de estilo usa `TEMA` en `.env` (`auto`, `normal`, `navidad`) o, siendo dueño, `.tema navidad` desde WhatsApp. Para crear otra festividad copia el bloque `navidad` de `temas.js` y cambia su clave, fechas y emojis.

Pruebas: `npm test`.
