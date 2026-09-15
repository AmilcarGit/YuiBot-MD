//CÓDIGO ORIGINAL DE YUIBOT-MD
// Horariogrupo: cierra el grupo (solo admins escriben) fuera del horario
// configurado, y lo reabre automáticamente dentro del horario. Se revisa
// periódicamente desde main.js/subbot.js (ver verificarYAplicar).
// Inspirado en commands/grupos/horariogrupo.js de fsociety-bot, con una
// implementación más simple.
//
// ⚠️ Las horas se comparan contra la hora DEL SERVIDOR (probablemente
// UTC en un VPS). Configura apertura/cierre pensando en esa zona horaria,
// no en la hora local del admin.

const fs = require('fs')
const path = require('path')
const { escribirJSONAtomico } = require('./escrituraAtomica')

const RUTA_DB = path.join(__dirname, '..', 'data', 'horariogrupo.json')

function asegurarArchivo() {
  const carpeta = path.dirname(RUTA_DB)
  if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true })
  if (!fs.existsSync(RUTA_DB)) escribirJSONAtomico(RUTA_DB, {})
}

function leer() {
  asegurarArchivo()
  try {
    const data = JSON.parse(fs.readFileSync(RUTA_DB, 'utf-8'))
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

function guardar(data) {
  escribirJSONAtomico(RUTA_DB, data)
}

function obtenerConfig(jidGrupo) {
  const data = leer()
  return { enabled: false, apertura: '08:00', cierre: '23:00', ultimoEstado: null, ...(data[jidGrupo] || {}) }
}

function guardarConfig(jidGrupo, cambios) {
  const data = leer()
  data[jidGrupo] = { ...obtenerConfig(jidGrupo), ...cambios }
  guardar(data)
  return data[jidGrupo]
}

function esHoraValida(hora) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(hora || '').trim())
}

function minutosDelDia(hora) {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
}

/** ¿La hora actual cae dentro del rango [apertura, cierre)? Soporta rangos que cruzan medianoche (ej: 22:00 a 06:00). */
function dentroDeHorario(apertura, cierre, ahora = new Date()) {
  const actual = ahora.getHours() * 60 + ahora.getMinutes()
  const inicio = minutosDelDia(apertura)
  const fin = minutosDelDia(cierre)

  if (inicio === fin) return true // 24 horas abierto
  if (inicio < fin) return actual >= inicio && actual < fin
  return actual >= inicio || actual < fin // cruza medianoche
}

/**
 * Revisa todos los grupos configurados y aplica el cierre/apertura que
 * corresponda según la hora actual. Se llama periódicamente (setInterval)
 * desde main.js/subbot.js, pasándole el socket activo.
 */
async function verificarYAplicar(sock) {
  const data = leer()

  for (const [jidGrupo, cfg] of Object.entries(data)) {
    if (!cfg?.enabled || !esHoraValida(cfg.apertura) || !esHoraValida(cfg.cierre)) continue

    const debeEstarAbierto = dentroDeHorario(cfg.apertura, cfg.cierre)
    const estadoDeseado = debeEstarAbierto ? 'abierto' : 'cerrado'

    if (cfg.ultimoEstado === estadoDeseado) continue // ya está como debe estar

    try {
      await sock.groupSettingUpdate(jidGrupo, debeEstarAbierto ? 'not_announcement' : 'announcement')
      guardarConfig(jidGrupo, { ultimoEstado: estadoDeseado })
      await sock.sendMessage(jidGrupo, {
        text: debeEstarAbierto
          ? `🔓 *Horario:* el grupo abrió automáticamente (${cfg.apertura} - ${cfg.cierre}).`
          : `🔒 *Horario:* el grupo cerró automáticamente hasta las ${cfg.apertura}.`,
      })
    } catch (error) {
      console.error(`[HORARIOGRUPO] No se pudo aplicar el cambio en ${jidGrupo} (¿el bot es admin?):`, error)
    }
  }
}

module.exports = { obtenerConfig, guardarConfig, esHoraValida, dentroDeHorario, verificarYAplicar }