//CÓDIGO ORIGINAL DE YUIBOT-MD
const fetch = require('../../lib/http').fetchSeguro // timeout por defecto (ver lib/http.js)
const { pedirTikTok } = require('../../lib/tiktok')
const { conFuentes, descargarLocal } = require('../../lib/youtube')
const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = require('@whiskeysockets/baileys')

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

async function enviarTikTokConBotones(sock, jid, msg, data, link, buffer, caption) {
  const media = await prepareWAMessageMedia(
    { video: buffer, mimetype: 'video/mp4' },
    { upload: sock.waUploadToServer }
  )

  const contenido = proto.Message.InteractiveMessage.create({
    body: proto.Message.InteractiveMessage.Body.create({
      text: caption
    }),
    footer: proto.Message.InteractiveMessage.Footer.create({
      text: '🦋 YuiBot-MD'
    }),
    header: proto.Message.InteractiveMessage.Header.create({
      title: '🎵 TikTok descargado',
      hasMediaAttachment: true,
      videoMessage: media.videoMessage
    }),
    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
      buttons: botonesTikTok(data, link),
      messageParamsJson: JSON.stringify({})
    })
  })

  const mensaje = generateWAMessageFromContent(
    jid,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: contenido
        }
      }
    },
    { userJid: sock.user?.id, quoted: msg }
  )

  await sock.relayMessage(jid, mensaje.message, { messageId: mensaje.key.id })
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

      // yt-dlp local primero (gratis); la API de antes queda como respaldo
      const data = await conFuentes({
        local: async () => {
          const r = await descargarLocal(link, 'video')
          return {
            titulo: r.info.description || r.titulo,
            autor: { nombre: r.info.uploader || r.canal },
            estadisticas: { vistas: r.info.view_count, likes: r.info.like_count },
            portada: r.info.thumbnail,
            datos: { archivo: 'tiktok.mp4' },
            buffer: r.buffer,
          }
        },
        api: async () => {
          const respuesta = await pedirTikTok(link)
          const archivo = await fetch(respuesta.datos.url)
          if (!archivo.ok) throw new Error(`No se pudo descargar el video (HTTP ${archivo.status})`)
          return { ...respuesta, buffer: Buffer.from(await archivo.arrayBuffer()) }
        },
      })
      const datos = data.datos
      const buffer = data.buffer
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
        await enviarTikTokConBotones(sock, jid, msg, data, link, buffer, caption)
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