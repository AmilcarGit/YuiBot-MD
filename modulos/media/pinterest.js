//CÓDIGO ORIGINAL DE YUIBOT-MD
const fetch = require('../../lib/http').fetchSeguro // timeout por defecto (ver lib/http.js)
const { APIS } = require('../../defaults')
const delirius = require('../../lib/delirius')

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
      // Delirius primero (gratis, sin key); la API anterior queda de respaldo
      let imagenes
      let total
      try {
        const urls = await delirius.buscarPinterest(query)
        total = urls.length
        imagenes = urls.slice(0, LIMITE).map((url) => ({ url, caption: `🖼️ ${query}` }))
      } catch (errorDelirius) {
        console.log('[PINTEREST] Delirius falló, probando la API anterior:', errorDelirius.message)
        const resp = await fetch(`${API_URL}?query=${encodeURIComponent(query)}&key=${encodeURIComponent(APIS.EVOGB_KEY)}`)
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
        const data = await resp.json()
        if (!data?.status || !Array.isArray(data?.response?.pins) || data.response.pins.length === 0) {
          throw new Error(`No se encontraron resultados para "${query}"`)
        }
        total = data.response.total
        imagenes = data.response.pins.slice(0, LIMITE).map((pin) => ({
          url: pin?.media?.images?.large?.url || pin?.media?.images?.orig?.url,
          caption: (pin.title?.trim() ? `🖼️ ${pin.title.trim()}\n` : '') + `👤 ${pin.uploader?.full_name || 'Desconocido'}`,
        }))
      }

      await sock.sendMessage(
        jid,
        { text: `🔎 Encontrados ${total} resultados para "${query}", enviando ${imagenes.length}...` },
        { quoted: msg }
      )

      for (const { url: urlImagen, caption } of imagenes) {
        if (!urlImagen) continue

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