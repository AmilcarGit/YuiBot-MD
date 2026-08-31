const API_KEY = 'lem_dc158e5ad3f4f6ee2de2905a222bfb68f61dd754'
const API_URL = 'https://api.lempi.lat/dl/ytv'

module.exports = {
  name: 'ytv',
  aliases: ['ytvideo'],

  description: 'Descarga un video de YouTube',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const youtubeUrl = args.join(' ').trim()

    // ─────────────────────────────
    // VALIDAR URL
    // ─────────────────────────────

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
      // ─────────────────────────────
      // MENSAJE DE ESPERA
      // ─────────────────────────────

      await sock.sendMessage(
        jid,
        {
          text:
            `⏳ Descargando video de YouTube...\n\n` +
            `🔗 ${youtubeUrl}`
        },
        { quoted: msg }
      )

      // ─────────────────────────────
      // LLAMAR A LA API
      // ─────────────────────────────

      const apiUrl =
        `${API_URL}?url=${encodeURIComponent(youtubeUrl)}` +
        `&apikey=${encodeURIComponent(API_KEY)}`

      const response = await fetch(apiUrl)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      console.log('[YTV] Respuesta API:', data)

      // ─────────────────────────────
      // VALIDAR RESPUESTA
      // ─────────────────────────────

      if (
        !data ||
        !data.status ||
        !data.datos ||
        !data.datos.url
      ) {
        throw new Error(
          data?.message ||
          data?.error ||
          'La API no devolvió el enlace de descarga'
        )
      }

      const videoUrl = data.datos.url

      const filename =
        data.datos.archivo ||
        `${data.titulo || 'youtube'}.mp4`

      // ─────────────────────────────
      // INFORMACIÓN DEL VIDEO
      // ─────────────────────────────

      const caption =
        `╭━━━〔 🎬 YOUTUBE VIDEO 〕━━━╮\n` +
        `┃ 🎵 ${data.titulo || 'Sin título'}\n` +
        `┃ 👤 ${data.canal || 'Desconocido'}\n` +
        `┃ ⏱️ ${data.duracion || 'Desconocida'}\n` +
        `┃ 🎞️ Calidad: ${data.datos.calidad || 'Desconocida'}\n` +
        `┃ 💾 Tamaño: ${data.datos.tamaño || 'Desconocido'}\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯`

      // ─────────────────────────────
      // ENVIAR VIDEO
      // ─────────────────────────────

      await sock.sendMessage(
        jid,
        {
          video: {
            url: videoUrl
          },
          mimetype: 'video/mp4',
          fileName: filename,
          caption
        },
        { quoted: msg }
      )

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