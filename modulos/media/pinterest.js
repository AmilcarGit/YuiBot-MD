//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../../defaults')

const API_URL = 'https://api.evogb.org/search/pinterestv2'
const LIMITE = 5

module.exports = {
  name: 'pinterest',
  aliases: ['pin', 'pinsearch'],
  description: 'Busca imágenes en Pinterest',
  category: 'media',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const query = args.join(' ').trim()

    if (!query) {
      return sock.sendMessage(
        jid,
        { text: `❌ Escribe qué quieres buscar.\n📌 Ejemplo: ${prefijo}pinterest Waifu` },
        { quoted: msg }
      )
    }

    try {
      const url = `${API_URL}?query=${encodeURIComponent(query)}&key=${encodeURIComponent(APIS.EVOGB_KEY)}`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()

      if (!data?.status || !Array.isArray(data?.response?.pins) || data.response.pins.length === 0) {
        throw new Error(`No se encontraron resultados para "${query}"`)
      }

      const pins = data.response.pins.slice(0, LIMITE)

      await sock.sendMessage(
        jid,
        { text: `🔎 Encontrados ${data.response.total} resultados para "${query}", enviando ${pins.length}...` },
        { quoted: msg }
      )

      for (const pin of pins) {
        const urlImagen = pin?.media?.images?.large?.url || pin?.media?.images?.orig?.url
        if (!urlImagen) continue

        const caption =
          (pin.title?.trim() ? `🖼️ ${pin.title.trim()}\n` : '') +
          `👤 ${pin.uploader?.full_name || 'Desconocido'}`

        try {
          const respImg = await fetch(urlImagen)
          if (!respImg.ok) continue
          const buffer = Buffer.from(await respImg.arrayBuffer())
          await sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg })
        } catch (errIndividual) {
          console.error(`[PINTEREST] Falló una imagen:`, errIndividual.message)
        }
      }
    } catch (error) {
      console.error('[PINTEREST]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo buscar en Pinterest.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}