//CÓDIGO ORIGINAL DE YUIBOT-MD
const { downloadContentFromMessage } = require('@whiskeysockets/baileys')
const { crearStickerWebp } = require('../../lib/stickers')

async function descargarMedia(mensaje, tipo) {
  const stream = await downloadContentFromMessage(mensaje, tipo)
  let buffer = Buffer.from([])
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk])
  }
  return buffer
}

module.exports = {
  name: 'sticker',
  aliases: ['s', 'stiker'],
  description: 'Convierte una imagen o video citado en sticker',
  category: 'media',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const citado = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

    let mediaMsg = null
    let tipo = null

    if (citado?.imageMessage) {
      mediaMsg = citado.imageMessage
      tipo = 'image'
    } else if (citado?.videoMessage) {
      mediaMsg = citado.videoMessage
      tipo = 'video'
    } else if (msg.message?.imageMessage) {
      mediaMsg = msg.message.imageMessage
      tipo = 'image'
    } else if (msg.message?.videoMessage) {
      mediaMsg = msg.message.videoMessage
      tipo = 'video'
    }

    if (!mediaMsg) {
      return sock.sendMessage(
        jid,
        {
          text: `❌ Cita una imagen o un video corto (máx. ~10s), o envíalo junto con "${config.PREFIXES[0]}sticker" como descripción.`
        },
        { quoted: msg }
      )
    }

    try {
      const buffer = await descargarMedia(mediaMsg, tipo)
      const webp = await crearStickerWebp(buffer, { animado: tipo === 'video', config })
      await sock.sendMessage(jid, { sticker: webp }, { quoted: msg })
    } catch (error) {
      console.error('[STICKER]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo crear el sticker.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}