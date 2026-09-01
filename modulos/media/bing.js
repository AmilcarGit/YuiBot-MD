//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../../defaults')

const API_URL = 'https://api.evogb.org/search/bingimage'
const LIMITE = 5

module.exports = {
  name: 'bing',
  aliases: ['bingimg', 'imagen'],
  description: 'Busca imágenes en Bing',
  category: 'media',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const query = args.join(' ').trim()

    if (!query) {
      return sock.sendMessage(
        jid,
        { text: `❌ Escribe qué quieres buscar.\n📌 Ejemplo: ${prefijo}bing Amor` },
        { quoted: msg }
      )
    }

    try {
      const url = `${API_URL}?query=${encodeURIComponent(query)}&key=${encodeURIComponent(APIS.EVOGB_KEY)}`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()

      if (!data?.status || !Array.isArray(data?.result) || data.result.length === 0) {
        throw new Error(`No se encontraron resultados para "${query}"`)
      }

      const resultados = data.result.slice(0, LIMITE)

      await sock.sendMessage(
        jid,
        { text: `🔎 Encontrados ${data.total} resultado(s) para "${query}", enviando ${resultados.length}...` },
        { quoted: msg }
      )

      for (const item of resultados) {
        const urlImagen = item?.image
        if (!urlImagen) continue

        const caption = item.title?.trim() ? `🖼️ ${item.title.trim()}` : ''

        try {
          const respImg = await fetch(urlImagen)
          if (!respImg.ok) continue
          const buffer = Buffer.from(await respImg.arrayBuffer())
          await sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg })
        } catch (errIndividual) {
          console.error(`[BING] Falló una imagen:`, errIndividual.message)
        }
      }
    } catch (error) {
      console.error('[BING]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo buscar en Bing.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}