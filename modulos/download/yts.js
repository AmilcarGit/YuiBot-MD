//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../../defaults')
const API_KEY = APIS.LEMPI_KEY
const API_URL = 'https://api.lempi.lat/s/youtube'

module.exports = {
  name: 'yts',
  aliases: ['ytsearch'],
  description: 'Busca videos en YouTube',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const query = args.join(' ').trim()

    if (!query) {
      return sock.sendMessage(
        jid,
        {
          text:
            `❌ Escribe algo para buscar.\n\n` +
            `📌 Ejemplo:\n` +
            `.yts William Luna`
        },
        { quoted: msg }
      )
    }

    try {
      await sock.sendMessage(
        jid,
        {
          text:
            `🔎 Buscando en YouTube...\n\n` +
            `> ${query}`
        },
        { quoted: msg }
      )

      const url =
        `${API_URL}?query=${encodeURIComponent(query)}` +
        `&apikey=${encodeURIComponent(API_KEY)}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (
        !data ||
        !data.status ||
        !data.datos ||
        !data.datos.results ||
        !Array.isArray(data.datos.results.videos)
      ) {
        throw new Error(
          data?.message ||
          data?.error ||
          'La API no devolvió resultados válidos'
        )
      }

      const videos = data.datos.results.videos

      if (videos.length === 0) {
        return sock.sendMessage(
          jid,
          {
            text: `❌ No encontré resultados para: ${query}`
          },
          { quoted: msg }
        )
      }

      const resultados = videos.slice(0, 10)

      let mensaje =
        `╭━━━〔 🔎 YOUTUBE SEARCH 〕━━━╮\n` +
        `┃ 🔍 Búsqueda: ${query}\n` +
        `┃ 📊 Resultados: ${resultados.length}\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`

      resultados.forEach((video, index) => {
        mensaje +=
          `╭─〔 ${index + 1} 〕──────────\n` +
          `│ 🎬 *${video.title || 'Sin título'}*\n` +
          `│ 👤 Canal: ${video.channel || 'Desconocido'}\n` +
          `│ ⏱️ Duración: ${video.duration || 'Desconocida'}\n` +
          `│ 👁️ Vistas: ${video.views || 'Desconocidas'}\n` +
          `│ 📅 Publicado: ${video.published || 'Desconocido'}\n` +
          `│ 🔗 ${video.url || 'Sin URL'}\n` +
          `╰────────────────────\n\n`
      })

      mensaje += `🤖 Powered by Lempi API`

      await sock.sendMessage(
        jid,
        {
          text: mensaje
        },
        { quoted: msg }
      )

    } catch (error) {
      console.error('[YTS]', error)

      await sock.sendMessage(
        jid,
        {
          text:
            `❌ Ocurrió un error al buscar.\n\n` +
            `> ${error.message || 'Error desconocido'}`
        },
        { quoted: msg }
      )
    }
  }
}