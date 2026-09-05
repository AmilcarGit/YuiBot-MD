//CÓDIGO ORIGINAL DE YUIBOT-MD
const { esPremium } = require('../../lib/subbots')
const { gruposLiderados } = require('../../lib/red')

module.exports = {
  name: 'misgrupos',
  aliases: ['grupos'],
  description: 'Muestra los grupos donde tu subbot tiene el liderazgo activo',
  category: 'subbot',
  ownerOnly: true,

  async execute(sock, msg, args, { esSubBot, subbotNumero }) {
    const jid = msg.key.remoteJid

    if (!esSubBot) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona ejecutado desde un subbot.' }, { quoted: msg })
    }

    if (!esPremium(subbotNumero)) {
      return sock.sendMessage(jid, { text: '⭐ Este comando es exclusivo para subbots premium.' }, { quoted: msg })
    }

    const grupos = gruposLiderados(subbotNumero)

    if (!grupos.length) {
      return sock.sendMessage(jid, { text: '📭 Tu subbot no tiene grupos liderados actualmente.' }, { quoted: msg })
    }

    const lineas = []
    for (const grupo of grupos) {
      let nombre = grupo
      try {
        const metadata = await sock.groupMetadata(grupo)
        nombre = metadata.subject || grupo
      } catch {}
      lineas.push(`  ❖ ${nombre}\n     ${grupo}`)
    }

    const texto = `⛧───「 Mis grupos 」───⛧\n\n${lineas.join('\n\n')}\n\n╰─➤ _${grupos.length} grupo(s)_ ⭐`
    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}
