//CÓDIGO ORIGINAL DE YUIBOT-MD
const { crearStickerWebp } = require('../../lib/stickers')

const SEARCH_URL = 'https://api.delirius.online/search/stickerly'
const DOWNLOAD_URL = 'https://api.delirius.online/download/stickerly'
const LIMITE = 10

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

async function descargarImagenValida(url) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
      'Referer': 'https://sticker.ly/',
    },
  })
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

  const buffer = Buffer.from(await resp.arrayBuffer())

  const esRiffValido = buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP'

  if (!esRiffValido) {
    throw new Error(`Link vencido o inválido (la API no devolvió un WebP real, ${buffer.length} bytes)`)
  }

  return buffer
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

      const seleccion = stickers.slice(0, LIMITE)
      await sock.sendMessage(jid, { text: `🔎 Encontrados ${stickers.length} stickers, procesando ${seleccion.length}...` }, { quoted: msg })

      let enviados = 0
      let fallidos = 0

      for (const st of seleccion) {
        const url = typeof st === 'string' ? st : st?.url || st?.image
        if (!url) {
          fallidos++
          continue
        }

        try {
          const buffer = await descargarImagenValida(url)
          const webp = await crearStickerWebp(buffer, { animado: false, config, extensionEntrada: 'webp' })
          await sock.sendMessage(jid, { sticker: webp }, { quoted: msg })
          enviados++
        } catch (errIndividual) {
          fallidos++
          console.error(`[STICKERLY] Falló ${url}:`, errIndividual.message)
        }
      }

      await sock.sendMessage(
        jid,
        { text: `✅ Enviados: ${enviados}${fallidos > 0 ? `\n⚠️ Fallidos: ${fallidos} (links vencidos de la API)` : ''}` },
        { quoted: msg }
      )

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