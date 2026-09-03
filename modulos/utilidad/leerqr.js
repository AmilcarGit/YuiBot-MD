//CÓDIGO ORIGINAL DE YUIBOT-MD
const { downloadContentFromMessage } = require('@whiskeysockets/baileys')
const { loadImage, createCanvas } = require('canvas')
const jsQR = require('jsqr')

async function descargarMedia(mensaje, tipo) {
  const stream = await downloadContentFromMessage(mensaje, tipo)
  let buffer = Buffer.from([])
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk])
  }
  return buffer
}

module.exports = {
  name: 'leerqr',
  aliases: ['readqr', 'qrread'],
  description: 'Lee el contenido de un código QR en una imagen',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const citado = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

    const mediaMsg = citado?.imageMessage || msg.message?.imageMessage

    if (!mediaMsg) {
      return sock.sendMessage(
        jid,
        { text: `❌ Cita una imagen con un QR, o envíala junto con "${prefijo}leerqr".` },
        { quoted: msg }
      )
    }

    try {
      const buffer = await descargarMedia(mediaMsg, 'image')
      const imagen = await loadImage(buffer)

      const canvas = createCanvas(imagen.width, imagen.height)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(imagen, 0, 0)

      const datos = ctx.getImageData(0, 0, imagen.width, imagen.height)
      const resultado = jsQR(datos.data, datos.width, datos.height)

      if (!resultado?.data) {
        return sock.sendMessage(jid, { text: '❌ No se encontró ningún código QR en esa imagen.' }, { quoted: msg })
      }

      await sock.sendMessage(
        jid,
        { text: `⛧───「 QR leído 」───⛧\n\n${resultado.data}\n\n╰─➤ _${config.BOT_NAME}_ 🥀` },
        { quoted: msg }
      )
    } catch (error) {
      console.error('[LEERQR]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo leer el QR.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}