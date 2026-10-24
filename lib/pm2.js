// Nombres de procesos PM2 — un solo lugar.
//
// Históricamente existen dos convenciones para los subbots:
//   - "subbot-<numero>"          → lo crea el comando .code (pm2 start subbot.js --name ...)
//   - "yuibot-subbot-<numero>"   → lo crea ecosystem.config.cjs
// Los comandos de gestión (.subbots, .reloadsubbots, .delsubbot, ...) solo
// conocían la primera, así que no veían (ni reiniciaban) los procesos del
// ecosystem. Acá se reconocen las dos, sin renombrar nada de lo que ya corre.

const PREFIJOS_SUBBOT = ['subbot-', 'yuibot-subbot-']

function nombresProcesoSubbot(numero) {
  return PREFIJOS_SUBBOT.map((prefijo) => `${prefijo}${numero}`)
}

function esProcesoSubbot(nombre) {
  return typeof nombre === 'string' && PREFIJOS_SUBBOT.some((prefijo) => nombre.startsWith(prefijo))
}

function numeroDeProcesoSubbot(nombre) {
  if (!esProcesoSubbot(nombre)) return null
  const prefijo = PREFIJOS_SUBBOT.find((p) => nombre.startsWith(p))
  return nombre.slice(prefijo.length)
}

// Cuando el proceso corre bajo PM2, PM2 expone su nombre real en process.env.name.
// Es la fuente más fiable para "reiniciarme a mí mismo", sin importar cómo se creó.
function nombreProcesoActual(respaldo) {
  return process.env.name || respaldo
}

function correEnPm2() {
  return process.env.pm_id !== undefined
}

module.exports = {
  nombresProcesoSubbot,
  esProcesoSubbot,
  numeroDeProcesoSubbot,
  nombreProcesoActual,
  correEnPm2,
}
