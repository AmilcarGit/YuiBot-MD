//CÓDIGO ORIGINAL DE YUIBOT-MD
const { reclamarDaily } = require('../../lib/db')

function formatearTiempo(ms) {
  const horas = Math.floor(ms / (1000 * 60 * 60))
  const minutos = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  return `${horas}h ${minutos}m`
}

module.exports = {
  name: 'daily',
  aliases: ['recompensa', 'diario'],
  description: 'Reclama tu recompensa diaria de monedas',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numero = remitente.split('@')[0].split(':')[0]

    const resultado = reclamarDaily(numero, config.ECONOMIA?.DAILY)

    if (!resultado.exito) {
      return sock.sendMessage(
        jid,
        { text: `⏳ Ya reclamaste tu recompensa de hoy. Vuelve en *${formatearTiempo(resultado.restanteMs)}*.` },
        { quoted: msg }
      )
    }

    await sock.sendMessage(
      jid,
      {
        text:
          `🎁 ¡Reclamaste tu recompensa diaria!\n\n` +
          `  ❖ ganaste: ${resultado.ganado} monedas\n` +
          `  ❖ balance total: ${resultado.monedas} monedas\n\n` +
          `╰─➤ _${config.BOT_NAME}_ 🥀`
      },
      { quoted: msg }
    )
  },
}