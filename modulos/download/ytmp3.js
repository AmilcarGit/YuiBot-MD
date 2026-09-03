//CÓDIGO ORIGINAL DE YUIBOT-MD
const { pedirAudio, pedirBusqueda } = require('../../lib/youtube')

module.exports = {
  name: 'ytmp3',
  aliases: ['play', 'ytaudio'],
  description: 'Descarga audio (MP3) de YouTube por enlace o nombre',
  category: 'download',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const entrada = args.join(' ').trim()

    if (!entrada) {
      return sock.sendMessage(
        jid,
        {
          text:
            `❌ Escribe el nombre de una canción o un enlace de YouTube.\n\n` +
            `📌 Ejemplos:\n` +
            `.play Bad Bunny Monaco\n` +
            `.play https://www.youtube.com/watch?v=ZFG0mHN-BNA`
        },
        { quoted: msg }
      )
    }

    try {
      let youtubeUrl = entrada
      let busqueda = false
      let resultadoBusqueda = null

      const esUrlYoutube =
        entrada.includes('youtube.com/') ||
        entrada.includes('youtu.be/')

      // Si NO es un enlace, buscar en YouTube
      if (!esUrlYoutube) {
        busqueda = true

        await sock.sendMessage(
          jid,
          {
            text: `🔎 Buscando en YouTube...\n\n> ${entrada}`
          },
          { quoted: msg }
        )

        const dataBusqueda = await pedirBusqueda(entrada)
        const videos = dataBusqueda?.datos?.results?.videos || []

        if (!videos.length) {
          return sock.sendMessage(
            jid,
            {
              text: `❌ No encontré resultados para:\n\n> ${entrada}`
            },
            { quoted: msg }
          )
        }

        // Tomar el primer resultado
        resultadoBusqueda = videos[0]

        if (!resultadoBusqueda?.url) {
          return sock.sendMessage(
            jid,
            {
              text: `❌ El primer resultado no tiene un enlace válido de YouTube.`
            },
            { quoted: msg }
          )
        }

        youtubeUrl = resultadoBusqueda.url

        console.log(
          `[PLAY] Resultado encontrado: ${resultadoBusqueda.title || 'Sin título'}`
        )
      }

      // Validar enlace
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

      // Mensaje de descarga
      const tituloBusqueda =
        resultadoBusqueda?.title || youtubeUrl

      await sock.sendMessage(
        jid,
        {
          text:
            `⏳ Descargando audio...\n\n` +
            `🎵 ${tituloBusqueda}`
        },
        { quoted: msg }
      )

      // Pedir el audio a la API
      const data = await pedirAudio(youtubeUrl)

      if (!data?.datos?.url) {
        throw new Error('La API no devolvió una URL válida para el audio.')
      }

      const audioUrl = data.datos.url

      const filename =
        data.datos.archivo ||
        `${data.titulo || resultadoBusqueda?.title || 'youtube'}.mp3`

      console.log(
        `[PLAY] Descargando archivo real desde: ${audioUrl}`
      )

      const fileResponse = await fetch(audioUrl)

      if (!fileResponse.ok) {
        throw new Error(
          `No se pudo descargar el archivo de audio (HTTP ${fileResponse.status})`
        )
      }

      const buffer = Buffer.from(
        await fileResponse.arrayBuffer()
      )

      const pesoMB =
        buffer.length / (1024 * 1024)

      console.log(
        `[PLAY] Peso real descargado: ${pesoMB.toFixed(2)} MB`
      )

      // Enviar audio
      await sock.sendMessage(
        jid,
        {
          audio: buffer,
          mimetype: 'audio/mpeg',
          fileName: filename,
          ptt: false
        },
        { quoted: msg }
      )

      // Información final
      const caption =
        `╭━━━〔 🎵 YOUTUBE AUDIO 〕━━━╮\n` +
        `┃ 🎵 ${data.titulo || resultadoBusqueda?.title || 'Sin título'}\n` +
        `┃ 👤 ${data.canal || resultadoBusqueda?.channel || 'Desconocido'}\n` +
        `┃ ⏱️ ${data.duracion || resultadoBusqueda?.duration || 'Desconocida'}\n` +
        `┃ 🎧 Calidad: ${data.datos.calidad || 'Desconocida'}\n` +
        `┃ 💾 Tamaño: ${pesoMB.toFixed(1)} MB\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯`

      await sock.sendMessage(
        jid,
        {
          text: caption
        },
        { quoted: msg }
      )

    } catch (error) {
      console.error('[PLAY/YTMP3]', error)

      await sock.sendMessage(
        jid,
        {
          text:
            `❌ No se pudo descargar el audio.\n\n` +
            `> ${error.message || 'Error desconocido'}`
        },
        { quoted: msg }
      )
    }
  }
}