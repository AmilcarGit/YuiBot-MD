//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../../defaults')
const { crearStickerWebp } = require('../../lib/stickers')

const SEARCH_URL = 'https://api.lempi.lat/s/stickers'
const LIMITE_STICKERS = 10

function extensionDe(url) {
  const match = url.match(/\.(\w+)(\?|$)/)
  return match ? match[1].toLowerCase() : 'png'
}

module.exports = {
  name: 'stickerly',
  aliases: ['spack', 'stickerpack'],
  description: 'Busca y envía un paquete de stickers',
  category: 'media',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]

    const partes = args.join(' ').trim().split(/\s+/)
    const ultimoEsNumero = /^\d+$/.test(partes[partes.length - 1])
    const numeroPack = ultimoEsNumero ? parseInt(partes.pop(), 10) : 1
    const query = partes.join(' ').trim()

    if (!query) {
      return sock.sendMessage(
        jid,
        {
          text:
            `❌ Escribe qué quieres buscar.\n\n` +
            `📌 Ejemplo: ${prefijo}stickerly gatitos\n` +
            `📌 Para elegir otro paquete de los resultados: ${prefijo}stickerly gatitos 3`
        },
        { quoted: msg }
      )
    }

    try {
      const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&apikey=${encodeURIComponent(APIS.LEMPI_KEY)}`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()

      if (!data?.status || !Array.isArray(data?.resultados) || data.resultados.length === 0) {
        throw new Error(`No se encontraron paquetes de stickers para "${query}"`)
      }

      const paquetes = data.resultados

      if (numeroPack < 1 || numeroPack > paquetes.length) {
        let lista = `❌ Ese paquete no existe. Hay ${paquetes.length} disponibles para "${query}":\n\n`
        paquetes.forEach((p, i) => {
          lista += `${i + 1}. ${p.titulo} — por ${p.autor} (${p.stickers.length} stickers)\n`
        })
        lista += `\n📌 Usa: ${prefijo}stickerly ${query} <número>`
        return sock.sendMessage(jid, { text: lista }, { quoted: msg })
      }

      const paquete = paquetes[numeroPack - 1]
      const seleccion = paquete.stickers.slice(0, LIMITE_STICKERS)

      await sock.sendMessage(
        jid,
        {
          text:
            `📦 "${paquete.titulo}" por ${paquete.autor}\n` +
            `Enviando ${seleccion.length} de ${paquete.stickers.length} stickers...`
        },
        { quoted: msg }
      )

      let enviados = 0
      let fallidos = 0

      for (const urlSticker of seleccion) {
        try {
          const respImg = await fetch(urlSticker)
          if (!respImg.ok) throw new Error(`HTTP ${respImg.status}`)

          const buffer = Buffer.from(await respImg.arrayBuffer())
          if (buffer.length < 200) throw new Error('Archivo demasiado pequeño')

          const ext = extensionDe(urlSticker)
          const esAnimado = ext === 'gif'

          const webp = await crearStickerWebp(buffer, { animado: esAnimado, config, extensionEntrada: ext })
          await sock.sendMessage(jid, { sticker: webp }, { quoted: msg })
          enviados++
        } catch (errIndividual) {
          fallidos++
          console.error(`[STICKERLY] Falló ${urlSticker}:`, errIndividual.message)
        }
      }

      await sock.sendMessage(
        jid,
        { text: `✅ Enviados: ${enviados}${fallidos > 0 ? `\n⚠️ Fallidos: ${fallidos}` : ''}` },
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