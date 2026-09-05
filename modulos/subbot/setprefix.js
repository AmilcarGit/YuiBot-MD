//CÓDIGO ORIGINAL DE YUIBOT-MD
const { esPremium, establecerPrefijo, obtenerPrefijo } = require('../../lib/subbots')

module.exports = {
  name: 'setprefix',
  aliases: ['setprefijo'],
  description: 'Cambia el prefijo de tu subbot premium',
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

    const nuevoPrefijo = (args[0] || '').trim()
    const actual = obtenerPrefijo(subbotNumero) || config.PREFIXES[0]

    if (!nuevoPrefijo) {
      return sock.sendMessage(jid, { text: `❌ Escribe un prefijo de 1 a 3 caracteres.\n📌 Ejemplo: ${actual}setprefix !` }, { quoted: msg })
    }

    if (nuevoPrefijo.length > 3 || /[\s]/.test(nuevoPrefijo)) {
      return sock.sendMessage(jid, { text: '❌ El prefijo debe tener entre 1 y 3 caracteres y no puede contener espacios.' }, { quoted: msg })
    }

    establecerPrefijo(subbotNumero, nuevoPrefijo)
    await sock.sendMessage(jid, { text: `✅ Prefijo actualizado a: *${nuevoPrefijo}*\n\nAhora usa ${nuevoPrefijo}comando para ejecutar tus comandos.` }, { quoted: msg })
  },
}
