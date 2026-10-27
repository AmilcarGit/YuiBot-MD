const { caja } = require('../../lib/estilo')
const { LIGAS } = require('../../lib/futbol')

module.exports = {
  name: 'ligas',
  aliases: ['ligasfutbol', 'torneos'],
  description: 'Lista de ligas y torneos disponibles',
  category: 'deportes',

  async execute(sock, msg, args, { config }) {
    const P = config.PREFIXES[0]
    const filas = Object.entries(LIGAS).map(([clave, l]) => `${l.emoji} *${l.nombre}* — ${clave}`)
    await sock.sendMessage(msg.key.remoteJid, {
      text: caja('🏆', 'Ligas', filas, `${P}marcador <liga> · ${P}tablaliga <liga> · ${P}fixture <liga>`),
    }, { quoted: msg })
  },
}
