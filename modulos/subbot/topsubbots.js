//CÓDIGO ORIGINAL DE YUIBOT-MD
const { listarSubbots, obtenerNombrePersonalizado, esPremium } = require('../../lib/subbots')
const { gruposLiderados } = require('../../lib/red')

module.exports = {
  name: 'topsubbots',
  aliases: ['rankingsubbots'],
  description: 'Ranking de subbots por grupos que lideran',
  category: 'subbot',
  ownerOnly: true,

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const numeros = listarSubbots()

    if (numeros.length === 0) {
      return sock.sendMessage(jid, { text: '📭 No hay subbots registrados todavía.' }, { quoted: msg })
    }

    const conteo = numeros
      .map((numero) => ({ numero, grupos: gruposLiderados(numero).length }))
      .sort((a, b) => b.grupos - a.grupos)

    let texto = `⛧───「 Top Subbots 」───⛧\n\n`
    conteo.forEach((item, i) => {
      const nombre = obtenerNombrePersonalizado(item.numero)
      const premium = esPremium(item.numero) ? ' ⭐' : ''
      texto += `${i + 1}. +${item.numero}${premium}${nombre ? ` (${nombre})` : ''} — ${item.grupos} grupo(s)\n`
    })
    texto += `\n╰─➤ _${config.BOT_NAME}_ 🥀`

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}