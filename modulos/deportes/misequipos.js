const { caja } = require('../../lib/estilo')
const alertas = require('../../lib/alertasFutbol')
const { enviarConBotones } = require('./_comun')

module.exports = {
  name: 'misequipos',
  aliases: ['equiposseguidos'],
  description: 'Equipos de los que recibes alertas en este chat',
  category: 'deportes',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const lista = alertas.listarDe(jid)
    if (!lista.length) return sock.sendMessage(jid, { text: `📭 Este chat no sigue a ningún equipo.\n📌 ${P}seguirequipo Alianza Lima` }, { quoted: msg })
    return enviarConBotones(sock, jid, msg, config, caja('🔔', 'Equipos seguidos', lista.map((s, i) => `${i + 1}. ⚽ ${s.nombre}`), `${lista.length}/${alertas.MAX_POR_CHAT} · avisos automáticos`),
      lista.slice(0, 3).map((s) => ({ text: `🔕 ${s.nombre}`.slice(0, 25), id: `${P}dejarequipo ${s.nombre}` })))
  },
}
