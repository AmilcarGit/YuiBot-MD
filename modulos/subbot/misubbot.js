//CÓDIGO ORIGINAL DE YUIBOT-MD
const { obtenerDuenoSubbot } = require('../../lib/subbots')
const { gruposLiderados } = require('../../lib/red')

function formatearDuracion(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = Math.floor(segundos % 60)
  return `${h}h ${m}m ${s}s`
}

module.exports = {
  name: 'misubbot',
  aliases: ['subbotinfo'],
  description: 'Muestra información de tu propio subbot',
  category: 'subbot',
  ownerOnly: true,

  async execute(sock, msg, args, { config, esSubBot, subbotNumero }) {
    const jid = msg.key.remoteJid

    if (!esSubBot) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona ejecutado desde un subbot, no desde el bot principal.' }, { quoted: msg })
    }

    const dueno = obtenerDuenoSubbot(subbotNumero)
    const grupos = gruposLiderados(subbotNumero)

    const texto =
      `⛧───「 Mi Subbot 」───⛧\n\n` +
      `  ❖ número: +${subbotNumero}\n` +
      `  ❖ dueño: ${dueno?.nombre || 'desconocido'}\n` +
      `  ❖ tiempo activo: ${formatearDuracion(process.uptime())}\n` +
      `  ❖ grupos que lidero ahora: ${grupos.length}\n\n` +
      `╰─➤ _${config.BOT_NAME}_ 🥀`

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}