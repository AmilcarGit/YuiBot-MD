//CÓDIGO ORIGINAL DE YUIBOT-MD
const { pedirAudio } = require('../../lib/youtube')

module.exports = {
  name: 'ytmp3',
  aliases: ['yta', 'ytaudio'],
  description: 'Descarga audio (MP3) de un video de YouTube',
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
            `.ytmp3 https://www.youtube.com/watch?v=ZFG0mHN-BNA`
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
        { text: '❌ El enlace no parece ser un enlace válido de YouTube.' },
        { quoted: msg }
      )
    }

    try {
      await sock.sendMessage(
        jid,
        { text: `⏳ Descargando audio de YouTube...\n\n🔗 ${youtubeUrl}` },
        { quoted: msg }
      )

      const data = await pedirAudio(youtubeUrl)
      const audioUrl = data.datos.url
      const filename = data.datos.archivo || `${data.titulo || 'youtube'}.mp3`

      console.log(`[YTMP3] Descargando archivo real desde: ${audioUrl}`)

      const fileResponse = await fetch(audioUrl)
      if (!fileResponse.ok) {
        throw new Error(`No se pudo descargar el archivo de audio (HTTP ${fileResponse.status})`)
      }

      const buffer = Buffer.from(await fileResponse.arrayBuffer())
      const pesoMB = buffer.length / (1024 * 1024)

      console.log(`[YTMP3] Peso real descargado: ${pesoMB.toFixed(2)} MB`)

      await sock.sendMessage(
        jid,
        {
          audio: buffer,
          mimetype: 'audio/mpeg',
          fileName: filename,
          ptt: false,
        },
        { quoted: msg }
      )

      const caption =
        `╭━━━〔 🎵 YOUTUBE AUDIO 〕━━━╮\n` +
        `┃ 🎵 ${data.titulo || 'Sin título'}\n` +
        `┃ 👤 ${data.canal || 'Desconocido'}\n` +
        `┃ ⏱️ ${data.duracion || 'Desconocida'}\n` +
        `┃ 🎧 Calidad: ${data.datos.calidad || 'Desconocida'}\n` +
        `┃ 💾 Tamaño: ${pesoMB.toFixed(1)} MB\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯`

      await sock.sendMessage(jid, { text: caption }, { quoted: msg })

    } catch (error) {
      console.error('[YTMP3]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo descargar el audio.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  }
}