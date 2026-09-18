//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../../defaults')
const { crearStickerWebp } = require('../../lib/stickers')

const SEARCH_URL = 'https://orbitcloud.hidenfree.com/api/v1/sticker-search'
const IP_HEADER = '10.226.224.247'
const LIMITE_STICKERS = 8

module.exports = {
  name: 'orbitsticker',
  aliases: ['ostiker', 'buscasticker'],
  description: 'Busca stickers usando la API de Orbit',
  category: 'media',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const query = args.join(' ').trim()

    if (!query) {
      return sock.sendMessage(
        jid,
        { text: `❌ Escribe qué quieres buscar.\n📌 Ejemplo: ${prefijo}orbitsticker gato` },
        { quoted: msg }
      )
    }

    try {
      const url = `${SEARCH_URL}?apikey=${encodeURIComponent(APIS.ORBIT_KEY)}&query=${encodeURIComponent(query)}`
      const resp = await fetch(url, { headers: { 'x-orbit-ip': IP_HEADER } })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()

      if (!data?.status || !Array.isArray(data?.results) || data.results.length === 0) {
        throw new Error(`No se encontraron stickers para "${query}"`)
      }

      const resultados = data.results.slice(0, LIMITE_STICKERS)

      await sock.sendMessage(
        jid,
        { text: `🔎 Encontrados ${data.total ?? data.results.length} resultados para "${query}", enviando ${resultados.length}...` },
        { quoted: msg }
      )

      let enviados = 0
      let fallidos = 0

      for (const item of resultados) {
        try {
          const respImg = await fetch(item.image)
          if (!respImg.ok) throw new Error(`HTTP ${respImg.status}`)

          const buffer = Buffer.from(await respImg.arrayBuffer())
          if (buffer.length < 200) throw new Error('Archivo demasiado pequeño')

          const webp = await crearStickerWebp(buffer, { animado: true, config, extensionEntrada: 'gif' })
          await sock.sendMessage(jid, { sticker: webp }, { quoted: msg })
          enviados++
        } catch (errIndividual) {
          fallidos++
          console.error(`[ORBITSTICKER] Falló ${item.id}:`, errIndividual.message)
        }
      }

      await sock.sendMessage(
        jid,
        { text: `✅ Enviados: ${enviados}${fallidos > 0 ? `\n⚠️ Fallidos: ${fallidos}` : ''}` },
        { quoted: msg }
      )
    } catch (error) {
      console.error('[ORBITSTICKER]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudieron obtener los stickers de "${query}".\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}
