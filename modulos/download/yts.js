//CÓDIGO ORIGINAL DE YUIBOT-MD
const { pedirBusqueda, pedirVideo } = require('../../lib/youtube')
const LIMITE_VIDEO_MB = 3000

async function descargarBuffer(url, intentos = 3) {
  let ultimoError = null

  for (let intento = 1; intento <= intentos; intento++) {
    try {
      const controlador = new AbortController()
      const temporizador = setTimeout(() => controlador.abort(), 60000)
      const respuesta = await fetch(url, {
        signal: controlador.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      })
      clearTimeout(temporizador)

      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)

      const buffer = Buffer.from(await respuesta.arrayBuffer())
      if (!buffer.length) throw new Error('Respuesta vacía')
      return buffer
    } catch (error) {
      ultimoError = error
      if (intento < intentos) await new Promise((resolve) => setTimeout(resolve, 1500 * intento))
    }
  }

  throw ultimoError || new Error('No se pudo descargar el archivo')
}

module.exports = {
  name: 'yts',
  aliases: ['ytsearch'],
  description: 'Busca videos en YouTube (responde con un número para descargar)',
  category: 'download',

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
      await sock.sendMessage(jid, { text: `🔎 Buscando en YouTube...\n\n> ${query}` }, { quoted: msg })

      const data = await pedirBusqueda(query)
      const videos = data.datos.results.videos
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

      mensaje += `╰─➤ _Responde con el número (1-${resultados.length}) para descargar ese video_ 🥀`

      const primeraMiniatura = resultados[0]?.thumbnail || resultados[0]?.thumb || resultados[0]?.image || null

      if (primeraMiniatura) {
        try {
          const bufferImg = await descargarBuffer(primeraMiniatura, 2)
          await sock.sendMessage(jid, { image: bufferImg, caption: mensaje }, { quoted: msg })
        } catch (errorImg) {
          console.log('[YTS] No se pudo enviar la miniatura, se envía solo texto:', errorImg.message)
          await sock.sendMessage(jid, { text: mensaje }, { quoted: msg })
        }
      } else {
        await sock.sendMessage(jid, { text: mensaje }, { quoted: msg })
      }

      const respuesta = await new Promise((resolve) => {
        const escuchar = (upsert) => {
          const nuevoMsg = upsert.messages?.[0]
          if (!nuevoMsg?.message) return
          const remitenteNuevo = nuevoMsg.key.participantAlt || nuevoMsg.key.participant || nuevoMsg.key.remoteJid
          const remitenteOriginal = msg.key.participantAlt || msg.key.participant || msg.key.remoteJid
          if (nuevoMsg.key.remoteJid !== jid || remitenteNuevo !== remitenteOriginal) return

          const texto = nuevoMsg.message.conversation || nuevoMsg.message.extendedTextMessage?.text || ''
          const numero = parseInt(texto.trim(), 10)
          if (numero >= 1 && numero <= resultados.length) {
            sock.ev.off('messages.upsert', escuchar)
            resolve(numero)
          }
        }
        sock.ev.on('messages.upsert', escuchar)
        setTimeout(() => {
          sock.ev.off('messages.upsert', escuchar)
          resolve(null)
        }, 60000)
      })

      if (!respuesta) return

      const elegido = resultados[respuesta - 1]
      if (!elegido?.url) {
        return sock.sendMessage(jid, { text: '❌ Ese resultado no tiene un enlace válido.' }, { quoted: msg })
      }

      await sock.sendMessage(jid, { text: `⏳ Descargando \"${elegido.title || 'video'}\"...` }, { quoted: msg })

      const dataVideo = await pedirVideo(elegido.url)
      const videoUrl = dataVideo.datos.url
      const filename = dataVideo.datos.archivo || `${dataVideo.titulo || 'youtube'}.mp4`
      const buffer = await descargarBuffer(videoUrl, 3)
      const pesoMB = buffer.length / (1024 * 1024)

      const caption =
        `╭━━━〔 🎬 YOUTUBE VIDEO 〕━━━╮\n` +
        `┃ 🎵 ${dataVideo.titulo || 'Sin título'}\n` +
        `┃ 👤 ${dataVideo.canal || 'Desconocido'}\n` +
        `┃ 💾 Tamaño: ${pesoMB.toFixed(1)} MB\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯`

      if (pesoMB <= LIMITE_VIDEO_MB) {
        await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4', fileName: filename, caption }, { quoted: msg })
      } else {
        await sock.sendMessage(jid, { document: buffer, mimetype: 'video/mp4', fileName: filename, caption }, { quoted: msg })
      }

    } catch (error) {
      console.error('[YTS]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ Ocurrió un error al buscar o descargar.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  }
}