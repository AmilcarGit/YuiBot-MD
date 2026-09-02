//CÓDIGO ORIGINAL DE YUIBOT-MD
const { obtenerUsuario } = require('../../lib/db')

module.exports = {
  name: 'monedas',
  aliases: ['money', 'coins', 'saldo'],
  description: 'Muestra cuántas monedas tienes',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numero = remitente.split('@')[0].split(':')[0]

    const datos = obtenerUsuario(numero)
    const monedas = datos?.monedas || 0

    await sock.sendMessage(
      jid,
      { text: `💰 Tienes *${monedas}* monedas.\n\n╰─➤ _Usa ${config.PREFIXES[0]}daily para ganar más_ 🥀` },
      { quoted: msg }
    )
  },
}