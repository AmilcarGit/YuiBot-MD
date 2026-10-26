//CÓDIGO ORIGINAL DE YUIBOT-MD
const { caja, negrita } = require('../../lib/estilo')
const fetch = require('../../lib/http').fetchSeguro // timeout por defecto (ver lib/http.js)
const { pedirVideo, pedirBusqueda, conFuentes, descargarLocal } = require('../../lib/youtube')
const LIMITE_VIDEO_MB = 3000

module.exports = {
  name: 'ytv',
  aliases: ['ytvideo', 'video'],
  description: 'Descarga un video de YouTube por enlace o nombre',
  category: 'download',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const entrada = args.join(' ').trim()

    if (!entrada) {
      return sock.sendMessage(
        jid,
        {
          text:
            `❌ Escribe el nombre de un video o un enlace de YouTube.\n\n` +
            `📌 Ejemplos:\n` +
            `.ytv Bad Bunny Monaco\n` +
            `.ytv https://www.youtube.com/watch?v=ZFG0mHN-BNA`
        },
        { quoted: msg }
      )
    }

    try {
      let youtubeUrl = entrada
      let resultadoBusqueda = null

      const esUrlYoutube =
        entrada.includes('youtube.com/') ||
        entrada.includes('youtu.be/')

      // Si no es un enlace, buscar en YouTube
      if (!esUrlYoutube) {
        await sock.sendMessage(
          jid,
          {
            text: `🔎 Buscando video en YouTube...\n\n> ${entrada}`
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
          `[YTV] Resultado encontrado: ${resultadoBusqueda.title || 'Sin título'}`
        )
      }

      // Validar URL
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

      const titulo =
        resultadoBusqueda?.title || youtubeUrl

      await sock.sendMessage(
        jid,
        {
          text: caja('🎬', 'Descargando video', [['Título', String(titulo).slice(0, 200)]], 'Esto puede tardar un poco ⏳')
        },
        { quoted: msg }
      )

      // yt-dlp local primero (gratis); la API de antes queda como respaldo
      const data = await conFuentes({
        local: async () => {
          const r = await descargarLocal(youtubeUrl, 'video')
          return {
            titulo: r.titulo, canal: r.canal, duracion: r.duracion,
            datos: { calidad: r.calidad, archivo: `${r.titulo.replace(/[\\/:*?"<>|]/g, '_')}.mp4` },
            buffer: r.buffer,
          }
        },
        api: async () => {
          const respuesta = await pedirVideo(youtubeUrl)
          if (!respuesta?.datos?.url) throw new Error('La API no devolvió una URL válida para el video.')
          const archivoResp = await fetch(respuesta.datos.url)
          if (!archivoResp.ok) throw new Error(`No se pudo descargar el archivo del video (HTTP ${archivoResp.status})`)
          return { ...respuesta, buffer: Buffer.from(await archivoResp.arrayBuffer()) }
        },
      })

      const buffer = data.buffer
      const filename = data.datos.archivo || `${data.titulo || resultadoBusqueda?.title || 'youtube'}.mp4`
      const pesoMB = buffer.length / (1024 * 1024)
      console.log(`[YTV] Peso real descargado: ${pesoMB.toFixed(2)} MB`)

      const caption = caja('🎬', 'YouTube Video', [
        ['Título', String(data.titulo || resultadoBusqueda?.title || 'Sin título').slice(0, 200), '🎵'],
        ['Canal', data.canal || resultadoBusqueda?.channel || 'Desconocido', '👤'],
        ['Duración', data.duracion || resultadoBusqueda?.duration || 'Desconocida', '⏱️'],
        ['Calidad', data.datos.calidad || 'Desconocida', '🎞️'],
        ['Tamaño', `${pesoMB.toFixed(1)} MB`, '💾']
      ], 'YuiBot-MD ✨')

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
        console.log(
          `[YTV] Peso mayor a ${LIMITE_VIDEO_MB}MB, enviando como documento`
        )

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