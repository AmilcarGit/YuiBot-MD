//CÓDIGO ORIGINAL DE YUIBOT-MD
const { esPremium, obtenerDuenoSubbot, obtenerNombrePersonalizado } = require('../../lib/subbots')

module.exports = {
  name: 'perfilbot',
  aliases: ['botperfil'],
  description: 'Muestra el perfil de tu subbot premium',
  category: 'subbot',
  ownerOnly: true,

  async execute(sock, msg, args, { config, esSubBot, subbotNumero }) {
    const jid = msg.key.remoteJid

    if (!esSubBot) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona ejecutado desde un subbot.' }, { quoted: msg })
    }

    if (!esPremium(subbotNumero)) {
      return sock.sendMessage(jid, { text: '⭐ Este comando es exclusivo para subbots premium.' }, { quoted: msg })
    }

    const dueno = obtenerDuenoSubbot(subbotNumero)
    const nombre = obtenerNombrePersonalizado(subbotNumero) || config.BOT_NAME
    const prefijo = config.PREFIXES[0]

    let foto = null
    try {
      foto = await sock.profilePictureUrl(sock.user?.id || `${subbotNumero}@s.whatsapp.net`, 'image')
    } catch {}

    const texto =
      `⛧───「 Perfil del Subbot 」───⛧\n\n` +
      `  ❖ nombre: *${nombre}*\n` +
      `  ❖ número: +${subbotNumero}\n` +
      `  ❖ dueño: ${dueno?.nombre || 'desconocido'}\n` +
      `  ❖ premium: ⭐ activo\n` +
      `  ❖ prefijo: ${prefijo}\n` +
      `  ❖ uptime: ${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m\n\n` +
      `╰─➤ _${config.BOT_NAME}_ ⭐`

    if (foto) {
      await sock.sendMessage(jid, { image: { url: foto }, caption: texto }, { quoted: msg })
    } else {
      await sock.sendMessage(jid, { text: texto }, { quoted: msg })
    }
  },
}
