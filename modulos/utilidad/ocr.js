//CÓDIGO ORIGINAL DE YUIBOT-MD
const { downloadContentFromMessage } = require('@whiskeysockets/baileys')
const { APIS } = require('../../defaults')

const API_URL = 'https://api.ocr.space/parse/image'

async function descargarMedia(mensaje, tipo) {
  const stream = await downloadContentFromMessage(mensaje, tipo)
  let buffer = Buffer.from([])
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk])
  }
  return buffer
}

module.exports = {
  name: 'ocr',
  aliases: ['leertexto', 'extraertexto'],
  description: 'Extrae el texto de una imagen',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const citado = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage

    const mediaMsg = citado?.imageMessage || msg.message?.imageMessage

    if (!mediaMsg) {
      return sock.sendMessage(
        jid,
        { text: `❌ Cita una imagen con texto, o envíala junto con "${prefijo}ocr".` },
        { quoted: msg }
      )
    }

    try {
      const buffer = await descargarMedia(mediaMsg, 'image')
      const base64 = buffer.toString('base64')

      const form = new URLSearchParams()
      form.append('apikey', APIS.OCR_KEY)
      form.append('base64Image', `data:image/jpeg;base64,${base64}`)
      form.append('language', 'spa')
      form.append('scale', 'true')

      const resp = await fetch(API_URL, { method: 'POST', body: form })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

      const data = await resp.json()

      if (data.IsErroredOnProcessing) {
        throw new Error(data.ErrorMessage?.[0] || 'La API no pudo procesar la imagen')
      }

      const texto = data?.ParsedResults?.[0]?.ParsedText?.trim()

      if (!texto) {
        return sock.sendMessage(jid, { text: '❌ No se encontró texto en esa imagen.' }, { quoted: msg })
      }

      await sock.sendMessage(
        jid,
        { text: `⛧───「 Texto extraído 」───⛧\n\n${texto}\n\n╰─➤ _${config.BOT_NAME}_ 🥀` },
        { quoted: msg }
      )
    } catch (error) {
      console.error('[OCR]', error)
      await sock.sendMessage(
        jid,
        { text: `❌ No se pudo extraer el texto.\n\n> ${error.message || 'Error desconocido'}` },
        { quoted: msg }
      )
    }
  },
}