//CÓDIGO ORIGINAL DE YUIBOT-MD
const { pedirTikTok } = require('../../lib/tiktok')

const LIMITE_VIDEO_MB = 64

function botonesTikTok(data, link) {
  const botones = [
    {
      name: 'cta_copy',
      buttonParamsJson: JSON.stringify({
        display_text: '📋 Copiar enlace',
        id: 'tiktok_url',
        copy_code: link
      })
    }
  ]

  if (data?.musica?.url) {
    botones.push({
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
        display_text: '🎵 Abrir audio',
        url: data.musica.url,
        merchant_url: data.musica.url
      })
    })
  }

  if (data?.portada) {
    botones.push({
      name: 'cta_url',
      buttonParamsJson: JSON.stringify({
        display_text: '🖼️ Ver portada',
        url: data.portada,
        merchant_url: data.portada
      })
    })
  }

  return botones
}

module.exports = {
  name: 'tiktok',
  aliases: ['tt', 'ttdl'],
  description: 'Descarga videos de TikTok',
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
            `❌ Debes enviar un enlace de TikTok.\n\n` +
            `📌 Ejemplo:\n${prefijo}tiktok https://vt.tiktok.com/ZSqF1r1S3/`
        },
        { quoted: msg }
      )
    }

    if (!/(?:tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)\//i.test(link)) {
      return sock.sendMessage(jid, { text: '❌ El enlace no parece ser de TikTok.' }, { quoted: msg })
    }

    try {
      await sock.sendMessage(jid, { text: `⏳ Descargando TikTok...\n\n🔗 ${link}` }, { quoted: msg })

      const data = await pedirTikTok(link)
      const datos = data.datos
      const archivo = await fetch(datos.url)

      if (!archivo.ok) throw new Error(`No se pudo descargar el video (HTTP ${archivo.status})`)

      const buffer = Buffer.from(await archivo.arrayBuffer())
      const pesoMB = buffer.length / (1024 * 1024)
      const autor = data.autor || {}
      const estadisticas = data.estadisticas || {}

      const caption =
        `╭━━━〔 🎵 TIKTOK 〕━━━╮\n` +
        `┃ 📝 ${data.titulo || 'Sin título'}\n` +
        `┃ 👤 ${autor.nombre || autor.usuario || 'Desconocido'}\n` +
        `┃ 🌎 Región: ${data.region || 'N/A'}\n` +
        `┃ 👁️ Vistas: ${estadisticas.vistas ?? 0}\n` +
        `┃ ❤️ Likes: ${estadisticas.likes ?? 0}\n` +
        `┃ 💾 Tamaño: ${pesoMB.toFixed(1)} MB\n` +
        `╰━━━━━━━━━━━━━━━━━━━━╯`

      if (pesoMB <= LIMITE_VIDEO_MB) {
        await sock.sendMessage(
          jid,
          {
            video: buffer,
            mimetype: 'video/mp4',
            fileName: datos.archivo || 'tiktok.mp4',
            caption
          },
          { quoted: msg }
        )
      } else {
        await sock.sendMessage(
          jid,
          {
            document: buffer,
            mimetype: 'video/mp4',
            fileName: datos.archivo || 'tiktok.mp4',
            caption
          },
          { quoted: msg }
        )
      }

      await sock.sendMessage(
        jid,
        {
          text: '✨ ¿Qué quieres hacer con este TikTok?',
          title: '🎵 TikTok descargado',
          footer: '🦋 YuiBot-MD',
          interactiveMessage: {
            title: '🎵 TikTok descargado',
            body: { text: 'Selecciona una opción:' },
            footer: { text: '🦋 YuiBot-MD' },
            nativeFlowMessage: {
              buttons: botonesTikTok(data, link)
            }
          }
        },
        { quoted: msg }
      )
    } catch (error) {
      console.error('[TIKTOK]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo descargar el TikTok.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}