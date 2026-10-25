const fetch = require('../../lib/http').fetchSeguro
const delirius = require('../../lib/delirius')
const { conFuentes, descargarLocal } = require('../../lib/youtube')

const LIMITE_VIDEO_MB = 64

module.exports = {
  name: 'facebook',
  aliases: ['fb', 'fbdl'],
  description: 'Descarga un video o reel público de Facebook',
  category: 'download',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const link = args.join(' ').trim()

    if (!link) {
      return sock.sendMessage(
        jid,
        { text: `❌ Debes enviar un enlace de Facebook.\n\n📌 Ejemplo:\n${prefijo}facebook https://www.facebook.com/watch/?v=1234567890` },
        { quoted: msg }
      )
    }

    if (!/(?:facebook\.com|fb\.watch|fb\.com)\//i.test(link)) {
      return sock.sendMessage(jid, { text: '❌ El enlace no parece ser de Facebook.' }, { quoted: msg })
    }

    try {
      await sock.sendMessage(jid, { text: `⏳ Descargando de Facebook...\n\n🔗 ${link}` }, { quoted: msg })

      // yt-dlp local primero (gratis); Delirius queda como respaldo
      const r = await conFuentes({
        local: () => descargarLocal(link, 'video'),
        api: async () => {
          const d = await delirius.facebook(link)
          const archivo = await fetch(d.url)
          if (!archivo.ok) throw new Error(`No se pudo descargar el video (HTTP ${archivo.status})`)
          return { buffer: Buffer.from(await archivo.arrayBuffer()), titulo: d.titulo, canal: 'Facebook', duracion: 'Desconocida' }
        },
      })
      const pesoMB = r.buffer.length / (1024 * 1024)

      const caption =
        `╭━━━〔 📘 FACEBOOK 〕━━━╮\n` +
        `┃ 📝 ${r.titulo || 'Sin título'}\n` +
        `┃ 👤 ${r.canal}\n` +
        `┃ ⏱️ ${r.duracion}\n` +
        `┃ 💾 Tamaño: ${pesoMB.toFixed(1)} MB\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━╯`

      const contenido = pesoMB <= LIMITE_VIDEO_MB
        ? { video: r.buffer, mimetype: 'video/mp4', fileName: 'facebook.mp4', caption }
        : { document: r.buffer, mimetype: 'video/mp4', fileName: 'facebook.mp4', caption }

      await sock.sendMessage(jid, contenido, { quoted: msg })
    } catch (error) {
      console.error('[FACEBOOK]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo descargar el video de Facebook.\n\n> ${error.message || 'Error desconocido'}\n\nSolo funcionan videos públicos.` },
        { quoted: msg }
      )
    }
  },
}
