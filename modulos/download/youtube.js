//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../../defaults')
const API_URL = 'https://api.lempi.lat/dl/ytv'
const LIMITE_VIDEO_MB = 1000

async function pedirConFallback(youtubeUrl) {
  const keys = [APIS.LEMPI_KEY, APIS.LEMPI_KEY_2].filter(Boolean)
  let ultimoError = null

  for (const key of keys) {
    try {
      const apiUrl = `${API_URL}?url=${encodeURIComponent(youtubeUrl)}&apikey=${encodeURIComponent(key)}`
      const response = await fetch(apiUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      if (!data?.status || !data?.datos?.url) {
        throw new Error(data?.message || data?.error || 'La API no devolvió el enlace de descarga')
      }

      return data
    } catch (error) {
      ultimoError = error
      console.log(`[YTV] Falló con una key, probando la siguiente si hay:`, error.message)
    }
  }

  throw ultimoError || new Error('Ninguna API key funcionó')
}

module.exports = {
  name: 'ytv',
  aliases: ['ytvideo'],
  description: 'Descarga un video de YouTube',
  category: 'download',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const youtubeUrl = args.join(' ').trim()

    if (!youtubeUrl) {
      return sock.sendMessage(
        jid,
        {
          text:
            `❌ Debes enviar un enlace de YouTube.\n\n` +
            `📌 Ejemplo:\n` +
            `.ytv https://www.youtube.com/watch?v=ZFG0mHN-BNA`
        },
        { quoted: msg }
      )
    }

    if (
      !youtubeUrl.includes('youtube.com/') &&
      !youtubeUrl.includes('youtu.be/')
    ) {
      return sock.sendMessage(
        jid,
        {
          text: '❌ El enlace no parece ser un enlace válido de YouTube.'
        },
        { quoted: msg }
      )
    }

    try {
      await sock.sendMessage(
        jid,
        {
          text:
            `⏳ Descargando video de YouTube...\n\n` +
            `🔗 ${youtubeUrl}`
        },
        { quoted: msg }
      )

      const data = await pedirConFallback(youtubeUrl)

      const videoUrl = data.datos.url

      const filename =
        data.datos.archivo ||
        `${data.titulo || 'youtube'}.mp4`

      console.log(`[YTV] Descargando archivo real desde: ${videoUrl}`)

      const fileResponse = await fetch(videoUrl)

      if (!fileResponse.ok) {
        throw new Error(`No se pudo descargar el archivo del video (HTTP ${fileResponse.status})`)
      }

      const arrayBuffer = await fileResponse.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const pesoMB = buffer.length / (1024 * 1024)

      console.log(`[YTV] Peso real descargado: ${pesoMB.toFixed(2)} MB`)

      const caption =
        `╭━━━〔 🎬 YOUTUBE VIDEO 〕━━━╮\n` +
        `┃ 🎵 ${data.titulo || 'Sin título'}\n` +
        `┃ 👤 ${data.canal || 'Desconocido'}\n` +
        `┃ ⏱️ ${data.duracion || 'Desconocida'}\n` +
        `┃ 🎞️ Calidad: ${data.datos.calidad || 'Desconocida'}\n` +
        `┃ 💾 Tamaño: ${pesoMB.toFixed(1)} MB\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯`

      if (pesoMB <= LIMITE_VIDEO_MB) {
        await sock.sendMessage(
          jid,
          {
            video: buffer,
            mimetype: 'video/mp4',
            fileName: filename,
            caption
          },
          { quoted: msg }
        )
      } else {
        console.log(`[YTV] Peso mayor a ${LIMITE_VIDEO_MB}MB, enviando como documento`)
        await sock.sendMessage(
          jid,
          {
            document: buffer,
            mimetype: 'video/mp4',
            fileName: filename,
            caption
          },
          { quoted: msg }
        )
      }

    } catch (error) {
      console.error('[YTV]', error)

      await sock.sendMessage(
        jid,
        {
          text:
            `❌ No se pudo descargar el video.\n\n` +
            `> ${error.message || 'Error desconocido'}`
        },
        { quoted: msg }
      )
    }
  }
}