//CÓDIGO ORIGINAL DE YUIBOT-MD
const { APIS } = require('../../defaults')

const API_URL = 'https://dv-yer-api.online/instagram'
const LIMITE_VIDEO_MB = 64

module.exports = {
  name: 'instagram',
  aliases: ['ig', 'igdl'],
  description: 'Descarga un video o reel de Instagram',
  category: 'download',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const link = args.join(' ').trim()

    if (!link) {
      return sock.sendMessage(
        jid,
        {
          text:
            `❌ Debes enviar un enlace de Instagram.\n\n` +
            `📌 Ejemplo:\n${prefijo}instagram https://www.instagram.com/reel/DCt2o8lMrsr/`
        },
        { quoted: msg }
      )
    }

    if (!link.includes('instagram.com/')) {
      return sock.sendMessage(jid, { text: '❌ El enlace no parece ser de Instagram.' }, { quoted: msg })
    }

    try {
      await sock.sendMessage(jid, { text: `⏳ Descargando de Instagram...\n\n🔗 ${link}` }, { quoted: msg })

      const url = `${API_URL}?mode=link&url=${encodeURIComponent(link)}&pick=1&lang=es&apikey=${encodeURIComponent(APIS.DVYER_KEY)}`
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()

      if (!data?.ok || !data?.selected?.download_url) {
        throw new Error(data?.message || 'No se pudo obtener el video')
      }

      const { selected, title, username } = data

      const respArchivo = await fetch(selected.download_url)
      if (!respArchivo.ok) throw new Error(`No se pudo descargar el archivo (HTTP ${respArchivo.status})`)

      const buffer = Buffer.from(await respArchivo.arrayBuffer())
      const pesoMB = buffer.length / (1024 * 1024)

      const caption =
        `╭━━━〔 📸 INSTAGRAM 〕━━━╮\n` +
        `┃ 📝 ${title || 'Sin título'}\n` +
        `┃ 👤 @${username || 'desconocido'}\n` +
        `┃ 💾 Tamaño: ${pesoMB.toFixed(1)} MB\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯`

      if (selected.type === 'video') {
        if (pesoMB <= LIMITE_VIDEO_MB) {
          await sock.sendMessage(
            jid,
            { video: buffer, mimetype: 'video/mp4', fileName: selected.filename || 'instagram.mp4', caption },
            { quoted: msg }
          )
        } else {
          await sock.sendMessage(
            jid,
            { document: buffer, mimetype: 'video/mp4', fileName: selected.filename || 'instagram.mp4', caption },
            { quoted: msg }
          )
        }
      } else {
        await sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg })
      }

    } catch (error) {
      console.error('[INSTAGRAM]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo descargar de Instagram.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}