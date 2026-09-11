//CÓDIGO ORIGINAL DE YUIBOT-MD
// ecosystem.config.cjs — configuración de PM2 para YuiBot-MD.
//
// Genera:
//   - "yuibot-md"            → proceso del bot principal (main.js)
//   - "yuibot-subbot-<num>"  → un proceso por cada subbot que YA esté
//                              vinculado (tiene subbots/<numero>/session/creds.json)
//
// Los subbots nuevos (todavía sin vincular) se siguen creando igual que
// antes (comando de subbot dentro del chat); una vez que quedan vinculados,
// basta con correr `pm2 reload ecosystem.config.cjs` (o `npm run pm2:restart`)
// para que PM2 los detecte y los tome bajo su control (autorestart, logs, etc).
//
// Esto es intencionalmente el modelo MÁS SIMPLE posible para la Fase 0:
// no cambia en nada cómo funcionan hoy los subbots (siguen siendo
// "node subbot.js <numero>", un proceso por número). Lo único que agrega
// PM2 es autorestart + logs centralizados + `pm2 monit`.

const fs = require('fs')
const path = require('path')

const RAIZ = __dirname
const CARPETA_SUBBOTS = path.join(RAIZ, 'subbots')

function listarSubbotsVinculados() {
  if (!fs.existsSync(CARPETA_SUBBOTS)) return []

  return fs
    .readdirSync(CARPETA_SUBBOTS, { withFileTypes: true })
    .filter((entrada) => entrada.isDirectory())
    .map((entrada) => entrada.name)
    .filter((numero) => fs.existsSync(path.join(CARPETA_SUBBOTS, numero, 'session', 'creds.json')))
}

const appsSubbots = listarSubbotsVinculados().map((numero) => ({
  name: `yuibot-subbot-${numero}`,
  script: 'subbot.js',
  args: numero,
  cwd: RAIZ,
  interpreter: 'node',
  watch: false,
  autorestart: true,
  max_restarts: 15,
  restart_delay: 5000,
  exp_backoff_restart_delay: 2000,
  max_memory_restart: '300M',
  env: { NODE_ENV: 'production' },
}))

module.exports = {
  apps: [
    {
      name: 'yuibot-md',
      script: 'main.js',
      cwd: RAIZ,
      interpreter: 'node',
      watch: false,
      autorestart: true,
      max_restarts: 15,
      restart_delay: 5000,
      exp_backoff_restart_delay: 2000,
      max_memory_restart: '400M',
      env: { NODE_ENV: 'production' },
    },
    ...appsSubbots,
  ],
}