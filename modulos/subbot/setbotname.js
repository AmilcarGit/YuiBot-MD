//CÓDIGO ORIGINAL DE YUIBOT-MD
const { esPremium, establecerNombrePersonalizado, obtenerNombrePersonalizado } = require('../../lib/subbots')

module.exports = {
  name: 'setbotname',
  aliases: ['setnombre'],
  description: 'Cambia el nombre visible de tu subbot (solo premium)',
  category: 'subbot',
  ownerOnly: true,

  async execute(sock, msg, args, { config, esSubBot, subbotNumero }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]

    if (!esSubBot) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona ejecutado desde un subbot.' }, { quoted: msg })
    }

    if (!esPremium(subbotNumero)) {
      return sock.sendMessage(
        jid,
        { text: '⭐ Este comando es exclusivo para subbots con token premium.\nPídele al creador del bot un token con el comando de token.' },
        { quoted: msg }
      )
    }

    const nuevoNombre = args.join(' ').trim()

    if (!nuevoNombre) {
      const actual = obtenerNombrePersonalizado(subbotNumero) || config.BOT_NAME
      return sock.sendMessage(
        jid,
        { text: `❌ Escribe el nuevo nombre.\n📌 Ejemplo: ${prefijo}setbotname Bot de Juan\n\nNombre actual: ${actual}` },
        { quoted: msg }
      )
    }

    if (nuevoNombre.length > 30) {
      return sock.sendMessage(jid, { text: '❌ Usa máximo 30 caracteres.' }, { quoted: msg })
    }

    establecerNombrePersonalizado(subbotNumero, nuevoNombre)
    await sock.sendMessage(jid, { text: `✅ Nombre de tu subbot actualizado a: *${nuevoNombre}*` }, { quoted: msg })
  },
}