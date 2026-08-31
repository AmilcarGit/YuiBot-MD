const API_KEY = 'lem_dc158e5ad3f4f6ee2de2905a222bfb68f61dd754'
const API_URL = 'https://api.lempi.lat/s/youtube'

module.exports = {
  name: 'yts',
  aliases: ['ytsearch'],

  description: 'Busca videos en YouTube',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const query = args.join(' ').trim()

    // ─────────────────────────────
    // VALIDAR BÚSQUEDA
    // ─────────────────────────────

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
      // ─────────────────────────────
      // MENSAJE DE ESPERA
      // ─────────────────────────────

      await sock.sendMessage(
        jid,
        {
          text:
            `🔎 Buscando en YouTube...\n\n` +
            `> ${query}`
        },
        { quoted: msg }
      )

      // ─────────────────────────────
      // CONSULTAR API
      // ─────────────────────────────

      const url =
        `${API_URL}?query=${encodeURIComponent(query)}` +
        `&apikey=${encodeURIComponent(API_KEY)}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      console.log('[YTS] Respuesta API:', data)

      // ─────────────────────────────
      // VALIDAR RESPUESTA
      // ─────────────────────────────

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

      // ─────────────────────────────
      // SIN RESULTADOS
      // ─────────────────────────────

      if (videos.length === 0) {
        return sock.sendMessage(
          jid,
          {
            text: `❌ No encontré resultados para: ${query}`
          },
          { quoted: msg }
        )
      }

      // Máximo 10 resultados
      const resultados = videos.slice(0, 10)

      // ─────────────────────────────
      // CREAR MENSAJE
      // ─────────────────────────────

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

      // ─────────────────────────────
      // ENVIAR RESULTADOS
      // ─────────────────────────────

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