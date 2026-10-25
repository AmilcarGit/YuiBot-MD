//CÓDIGO ORIGINAL DE YUIBOT-MD
const { downloadContentFromMessage } = require('@whiskeysockets/baileys')
const { crearStickerWebp } = require('../../lib/stickers')
const { reintentar, esErrorPasajero } = require('../../lib/reintentar')

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
      // La descarga también falla a veces por DNS/red del celular: se reintenta.
      const buffer = await reintentar(() => descargarMedia(mediaMsg, tipo))
      const webp = await crearStickerWebp(buffer, { animado: tipo === 'video', config })
      // La subida a WhatsApp falla a veces por un momento (error 500 de sus servidores): se reintenta.
      await reintentar(() => sock.sendMessage(jid, { sticker: webp }, { quoted: msg }))
    } catch (error) {
      console.error('[STICKER]', error)
      const motivo = esErrorPasajero(error)
        ? 'No hubo conexión estable con WhatsApp en este momento. Inténtalo de nuevo en unos segundos.'
        : error.message || 'Error desconocido'
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo crear el sticker.\n\n> ${motivo}` },
        { quoted: msg }
      )
    }
  },
}