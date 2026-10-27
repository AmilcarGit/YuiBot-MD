const alertas = require('../../lib/alertasFutbol')

module.exports = {
  name: 'dejarequipo',
  aliases: ['unfollowteam', 'noseguirequipo'],
  description: 'Deja de recibir alertas de un equipo: dejarequipo Alianza',
  category: 'deportes',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    if (!args.length) return sock.sendMessage(jid, { text: `❌ Escribe el equipo.\n\n📌 Ejemplo: ${config.PREFIXES[0]}dejarequipo Alianza` }, { quoted: msg })
    const quitados = alertas.dejar(jid, args.join(' '))
    return sock.sendMessage(jid, { text: quitados.length ? `🔕 Dejaste de seguir a: ${quitados.map((q) => `*${q.nombre}*`).join(', ')}.` : `❌ No sigues a "${args.join(' ')}" en este chat. Mira ${config.PREFIXES[0]}misequipos` }, { quoted: msg })
  },
}
