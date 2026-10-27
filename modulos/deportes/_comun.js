// Ayudas compartidas por los comandos de fútbol (el guion bajo evita que se cargue como comando).
const { enviarConRespaldo } = require('../../lib/whatsapp/interactivos')
const { LIGAS } = require('../../lib/futbol')

const nombreBot = (config) => config.BOT_NAME || 'YuiBot-MD'

/** Secciones de la lista desplegable con todas las ligas: cada fila ejecuta `<prefijo><comando> <liga>`. */
function seccionesLigas(P, comando) {
  const filas = Object.entries(LIGAS).map(([clave, l]) => ({
    title: `${l.emoji} ${l.nombre}`.slice(0, 24),
    description: `${P}${comando} ${clave}`,
    id: `${P}${comando} ${clave}`,
  }))
  return [{ title: '🏆 Elige una liga', rows: filas }]
}

/** Envía texto con una lista desplegable (o botones, o solo texto si WhatsApp los rechaza). */
function enviarConLista(sock, jid, msg, config, { texto, comando, botones = [], tituloLista = '🏆 Elegir liga' }) {
  const P = config.PREFIXES[0]
  const intentos = [
    ['lista', { text: texto, footer: nombreBot(config), buttons: [{ text: tituloLista, sections: seccionesLigas(P, comando) }] }],
  ]
  if (botones.length) intentos.push(['botones', { text: texto, footer: nombreBot(config), buttons: botones.slice(0, 3) }])
  intentos.push(['texto', { text: texto }])
  return enviarConRespaldo(sock, jid, intentos, { quoted: msg }, 'FUTBOL')
}

function enviarConBotones(sock, jid, msg, config, texto, botones) {
  const intentos = []
  if (botones.length) intentos.push(['botones', { text: texto, footer: nombreBot(config), buttons: botones.slice(0, 3) }])
  intentos.push(['texto', { text: texto }])
  return enviarConRespaldo(sock, jid, intentos, { quoted: msg }, 'FUTBOL')
}

function botonesLiga(P, clave) {
  return [
    { text: '📊 Tabla', id: `${P}tablaliga ${clave}` },
    { text: '📅 Próximos', id: `${P}fixture ${clave}` },
    { text: '🔴 En vivo', id: `${P}envivo` },
  ]
}

const errorRed = (error) => `❌ No pude consultar los resultados ahora (${String(error?.message || 'sin conexión').slice(0, 80)}). Intenta en un momento.`

module.exports = { seccionesLigas, enviarConLista, enviarConBotones, botonesLiga, errorRed }
