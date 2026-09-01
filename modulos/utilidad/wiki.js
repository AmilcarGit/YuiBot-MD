//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../../defaults')

const API_URL = 'https://api.evogb.org/search/wikipedia'
const LIMITE_CARACTERES = 1200

module.exports = {
  name: 'wiki',
  aliases: ['wikipedia'],
  description: 'Busca información en Wikipedia',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const query = args.join(' ').trim()

    if (!query) {
      return sock.sendMessage(
        jid,
        { text: `❌ Escribe qué quieres buscar.\n📌 Ejemplo: ${prefijo}wiki Waifu` },
        { quoted: msg }
      )
    }

    try {
      const url = `${API_URL}?query=${encodeURIComponent(query)}&lang=es&key=${encodeURIComponent(APIS.EVOGB_KEY)}`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()

      if (!data?.status || !data?.data) {
        throw new Error(`No se encontraron resultados para "${query}"`)
      }

      const { title, extract, url: urlArticulo } = data.data

      let resumen = (extract || '').trim()
      let cortado = false
      if (resumen.length > LIMITE_CARACTERES) {
        resumen = resumen.slice(0, LIMITE_CARACTERES).trim()
        cortado = true
      }

      const texto =
        `⛧───「 ${title} 」───⛧\n\n` +
        `${resumen}${cortado ? '…' : ''}\n\n` +
        `🔗 ${urlArticulo}\n\n` +
        `╰─➤ _${config.BOT_NAME}_ 🥀`

      await sock.sendMessage(jid, { text: texto }, { quoted: msg })
    } catch (error) {
      console.error('[WIKI]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo buscar en Wikipedia.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}