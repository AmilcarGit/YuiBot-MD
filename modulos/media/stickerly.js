//CÓDIGO ORIGINAL DE YUIBOT-MD
const { crearStickerWebp } = require('../../lib/stickers')

const SEARCH_URL = 'https://api.delirius.online/search/stickerly'
const DOWNLOAD_URL = 'https://api.delirius.online/download/stickerly'

function extraerLista(json) {
  if (Array.isArray(json)) return json
  if (Array.isArray(json?.data)) return json.data
  if (Array.isArray(json?.data?.result)) return json.data.result
  if (Array.isArray(json?.result)) return json.result
  return []
}

function urlDePaquete(item) {
  return item?.url || item?.link || item?.share_url || item?.packUrl || null
}

function esUrlStickerly(texto) {
  return /^https?:\/\/(www\.)?sticker\.ly\//i.test(texto)
}

module.exports = {
  name: 'stickerly',
  aliases: ['spack', 'stickerpack'],
  description: 'Busca y envía stickers desde Sticker.ly',
  category: 'media',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const query = args.join(' ').trim()

    if (!query) {
      return sock.sendMessage(
        jid,
        {
          text:
            `❌ Escribe una búsqueda o pega el link de un pack de sticker.ly.\n` +
            `📌 Ejemplo: ${prefijo}stickerly my melody\n` +
            `📌 Ejemplo: ${prefijo}stickerly https://sticker.ly/s/MPTYYK`
        },
        { quoted: msg }
      )
    }

    try {
      let urlPaquete = query

      if (!esUrlStickerly(query)) {
        const respBusqueda = await fetch(`${SEARCH_URL}?query=${encodeURIComponent(query)}`)
        if (!respBusqueda.ok) throw new Error(`La búsqueda respondió con estado ${respBusqueda.status}`)

        const jsonBusqueda = await respBusqueda.json()
        const lista = extraerLista(jsonBusqueda)

        if (!lista.length) {
          throw new Error(`No se encontraron packs de stickers para "${query}"`)
        }

        urlPaquete = urlDePaquete(lista[0])
        if (!urlPaquete) {
          throw new Error('No se pudo obtener la URL del primer resultado')
        }
      }

      const respDescarga = await fetch(`${DOWNLOAD_URL}?url=${encodeURIComponent(urlPaquete)}`)
      if (!respDescarga.ok) throw new Error(`La descarga respondió con estado ${respDescarga.status}`)

      const jsonDescarga = await respDescarga.json()
      const stickers = extraerLista(
        jsonDescarga?.data?.stickers || jsonDescarga?.stickers || jsonDescarga
      )

      if (!stickers.length) {
        throw new Error(`No se pudieron obtener los stickers de "${query}"`)
      }

      const LIMITE = 10
      const seleccion = stickers.slice(0, LIMITE)

      await sock.sendMessage(jid, { text: `🔎 Encontrados ${stickers.length} stickers, enviando ${seleccion.length}...` }, { quoted: msg })

      for (const st of seleccion) {
        const url = typeof st === 'string' ? st : st?.url || st?.image
        if (!url) continue

        try {
          const respImg = await fetch(url)
          if (!respImg.ok) continue
          const buffer = Buffer.from(await respImg.arrayBuffer())
          const webp = await crearStickerWebp(buffer, { animado: false, config })
          await sock.sendMessage(jid, { sticker: webp }, { quoted: msg })
        } catch (errIndividual) {
          console.error('[STICKERLY] Error en un sticker individual:', errIndividual)
        }
      }
    } catch (error) {
      console.error('[STICKERLY]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudieron obtener los stickers de "${query}".\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}