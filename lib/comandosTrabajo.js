// Fábrica de los comandos para ganar monedas de un solo toque (.trabajar, .minar, .pescar…).
const T = require('./trabajos')
const { caja } = require('./estilo')
const { numeroUsuario } = require('./juegos')
const { enviarConRespaldo } = require('./whatsapp/interactivos')

/** Envía el resultado con botones para seguir (o solo texto si WhatsApp los rechaza). */
function enviarConBotones(sock, jid, msg, config, texto, botones) {
  const intentos = []
  if (botones?.length) intentos.push(['botones', { text: texto, footer: config.BOT_NAME || 'YuiBot-MD', buttons: botones.slice(0, 3) }])
  intentos.push(['texto', { text: texto }])
  return enviarConRespaldo(sock, jid, intentos, { quoted: msg }, 'TRABAJOS')
}

const botonesFinales = (P, clave) => [
  { text: '🧰 Mis trabajos', id: `${P}trabajos` },
  { text: '💰 Mi saldo', id: `${P}monedas` },
  ...(clave === 'granja' ? [] : []),
]

/** Muestra el resultado de un trabajo ya resuelto. */
async function mostrarResultado(sock, jid, msg, config, def, resultado, cobro, extraPie = '') {
  const P = config.PREFIXES[0]
  const signo = cobro.delta > 0 ? `+${T.dinero(cobro.delta)}` : cobro.delta < 0 ? `-${T.dinero(-cobro.delta)}` : '0'
  const filas = [...resultado.filas, [cobro.delta < 0 ? 'Perdiste' : 'Ganaste', `${signo} monedas`, cobro.delta < 0 ? '📉' : '💰'], ['Saldo', `${T.dinero(cobro.saldo)} monedas`, '🏦']]
  const pie = `${extraPie || `Vuelve en ${T.formatoTiempo(def.espera)}`} · ${P}trabajos`
  return enviarConBotones(sock, jid, msg, config, caja(def.emoji, def.titulo, filas, pie), botonesFinales(P))
}

function crearComandoTrabajo(clave, { aliases = [], description }) {
  const def = T.TRABAJOS[clave]
  return {
    name: clave, aliases, description, category: 'diversion',
    async execute(sock, msg, args, { config }) {
      const jid = msg.key.remoteJid
      const numero = numeroUsuario(msg)
      const P = config.PREFIXES[0]
      const espera = T.esperaEfectiva(numero, def.espera)
      const cd = T.usarCooldown(numero, clave, espera)
      if (!cd.ok) {
        return enviarConBotones(sock, jid, msg, config, `⏳ ${def.aviso}.\nVuelve en *${T.formatoTiempo(cd.restanteMs)}*.\n\n🧰 Mira todo lo que puedes hacer ahora con *${P}trabajos*`, [{ text: '🧰 Mis trabajos', id: `${P}trabajos` }])
      }
      const resultado = T.conMejoras(numero, clave, def.resolver({ nivel: T.nivelDe(numero), rng: Math.random, numero }))
      const cobro = T.aplicar(numero, resultado.ganancia)
      T.registrar(numero, clave, cobro.delta)
      return mostrarResultado(sock, jid, msg, config, { ...def, espera }, resultado, cobro)
    },
  }
}

module.exports = { crearComandoTrabajo, mostrarResultado, enviarConBotones }
