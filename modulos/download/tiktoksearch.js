//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../../defaults')

const SEARCH_URL = 'https://orbitcloud.hidenfree.com/api/v1/tiktok-search'
const LIMITE_RESULTADOS = 10
const LIMITE_VIDEO_MB = 64
const ESPERA_RESPUESTA_MS = 60000

function truncar(texto, max) {
  if (!texto) return 'Sin descripción'
  const limpio = texto.trim()
  return limpio.length > max ? `${limpio.slice(0, max)}...` : limpio
}

function formatearNumero(numero) {
  return (numero ?? 0).toLocaleString('es')
}

module.exports = {
  name: 'tiktoksearch',
  aliases: ['ttsearch', 'ttbuscar'],
  description: 'Busca videos de TikTok por palabra clave (vía Orbit API)',
  category: 'download',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const query = args.join(' ').trim()

    if (!query) {
      return sock.sendMessage(
        jid,
        { text: `❌ Escribe qué quieres buscar.\n📌 Ejemplo: ${prefijo}tiktoksearch amor` },
        { quoted: msg }
      )
    }

    try {
      await sock.sendMessage(jid, { text: `🔎 Buscando en TikTok...\n\n> ${query}` }, { quoted: msg })

      const url = `${SEARCH_URL}?apikey=${encodeURIComponent(APIS.ORBIT_KEY)}&query=${encodeURIComponent(query)}`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()

      if (!data?.status || !Array.isArray(data?.results) || data.results.length === 0) {
        throw new Error(`No se encontraron videos para "${query}"`)
      }

      const resultados = data.results.slice(0, LIMITE_RESULTADOS)

      let mensaje =
        `╭━━━〔 🎵 TIKTOK SEARCH 〕━━━╮\n` +
        `┃ 🔍 Búsqueda: ${query}\n` +
        `┃ 📊 Resultados: ${resultados.length}\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯\n\n`

      resultados.forEach((video, index) => {
        mensaje +=
          `╭─〔 ${index + 1} 〕──────────\n` +
          `│ 📝 ${truncar(video.desc, 80)}\n` +
          `│ 👤 @${video.author?.uniqueId || 'desconocido'}\n` +
          `│ ⏱️ Duración: ${video.video?.duration ?? '?'}s\n` +
          `│ ▶️ Reproducciones: ${formatearNumero(video.stats?.playCount)}\n` +
          `│ ❤️ Likes: ${formatearNumero(video.stats?.diggCount)}\n` +
          `╰────────────────────\n\n`
      })

      mensaje += `╰─➤ _Responde con el número (1-${resultados.length}) para descargar ese video_ 🥀\n`
      mensaje += `\n🌐 Resultados vía Orbit API`

      await sock.sendMessage(jid, { text: mensaje }, { quoted: msg })

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
        }, ESPERA_RESPUESTA_MS)
      })

      if (!respuesta) return

      const elegido = resultados[respuesta - 1]
      const enlaceDescarga = elegido.video?.download || elegido.video?.play

      if (!enlaceDescarga) {
        return sock.sendMessage(jid, { text: '❌ Ese resultado no tiene un video descargable.' }, { quoted: msg })
      }

      await sock.sendMessage(jid, { text: `⏳ Descargando "${truncar(elegido.desc, 50)}"...` }, { quoted: msg })

      const archivo = await fetch(enlaceDescarga)
      if (!archivo.ok) throw new Error(`No se pudo descargar el video (HTTP ${archivo.status})`)

      const buffer = Buffer.from(await archivo.arrayBuffer())
      const pesoMB = buffer.length / (1024 * 1024)

      const caption =
        `╭━━━〔 🎵 TIKTOK 〕━━━╮\n` +
        `┃ 📝 ${truncar(elegido.desc, 100)}\n` +
        `┃ 👤 @${elegido.author?.uniqueId || 'desconocido'}\n` +
        `┃ 🎶 ${elegido.music?.title || 'Sin música'}\n` +
        `┃ 💾 Tamaño: ${pesoMB.toFixed(1)} MB\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯\n` +
        `🌐 Vía Orbit API — créditos a @${elegido.author?.uniqueId || 'autor original'} en TikTok`

      if (pesoMB <= LIMITE_VIDEO_MB) {
        await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4', caption }, { quoted: msg })
      } else {
        await sock.sendMessage(
          jid,
          { document: buffer, mimetype: 'video/mp4', fileName: 'tiktok.mp4', caption },
          { quoted: msg }
        )
      }
    } catch (error) {
      console.error('[TIKTOKSEARCH]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo buscar en TikTok.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}
