// COMANDO PARA LEER MENSAJES DE UNA SOLA VISTA (VIEW ONCE) - VERSIÓN YUIBOT-MD

const unwrap = (obj, depth = 0) => {
  if (!obj || typeof obj !== 'object' || depth > 6) return obj
  if (obj.message && typeof obj.message === 'object') return unwrap(obj.message, depth + 1)
  for (const key of ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension', 'documentWithCaptionMessage', 'associatedChildMessage', 'editedMessage']) {
    if (obj[key] && typeof obj[key] === 'object') return unwrap(obj[key].message || obj[key], depth + 1)
  }
  return obj
}

const getMedia = (quoted) => {
  const content = unwrap(quoted)
  if (content?.imageMessage || content?.videoMessage || content?.audioMessage || content?.documentMessage || content?.stickerMessage) {
    if (content.imageMessage) return { mediaMsg: content.imageMessage, type: 'image' }
    if (content.videoMessage) return { mediaMsg: content.videoMessage, type: 'video' }
    if (content.audioMessage) return { mediaMsg: content.audioMessage, type: 'audio' }
    if (content.documentMessage) return { mediaMsg: content.documentMessage, type: 'document' }
    return { mediaMsg: content.stickerMessage, type: 'image' }
  }
  if (content?.url || content?.directPath) {
    const mime = String(content.mimetype || '').split('/')[0]
    return { mediaMsg: content, type: ['image', 'video', 'audio', 'document'].includes(mime) ? mime : (content.fileName ? 'document' : 'image') }
  }
  if (content?.interactiveMessage?.header?.imageMessage || content?.interactiveMessage?.header?.videoMessage) {
    return content.interactiveMessage.header.imageMessage
      ? { mediaMsg: content.interactiveMessage.header.imageMessage, type: 'image' }
      : { mediaMsg: content.interactiveMessage.header.videoMessage, type: 'video' }
  }
  return null
}

const buildPayload = (buffer, mediaMsg, type) => {
  const caption = mediaMsg.caption || ''
  if (type === 'video') return { video: buffer, caption, mimetype: mediaMsg.mimetype || 'video/mp4' }
  if (type === 'image') return /webp/i.test(mediaMsg.mimetype || '') ? { sticker: buffer } : { image: buffer, caption }
  if (type === 'audio') return { audio: buffer, mimetype: mediaMsg.mimetype || 'audio/ogg; codecs=opus', ptt: mediaMsg.ptt || false }
  return { document: buffer, fileName: mediaMsg.fileName || 'archivo', mimetype: mediaMsg.mimetype || 'application/octet-stream', caption }
}

module.exports = {
  name: 'ver',
  aliases: ['readviewonce', 'read'],
  description: 'Lee un mensaje de una sola vista (view once)',
  category: 'tools',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid

    // --- OBTENER MENSAJE CITADO ---
    // En Yuibot-MD, el mensaje citado está en contextInfo.quotedMessage
    const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quotedMsg) {
      return sock.sendMessage(jid, {
        text: '> ♧ Por favor, responde a un mensaje de una sola vista para ver su contenido.'
      }, { quoted: msg })
    }

    try {
      // Reacción de "cargando"
      await sock.sendMessage(jid, { react: { key: msg.key, text: '🕒' } })

      // Detectar el medio dentro del mensaje citado
      const media = getMedia(quotedMsg)
      if (!media) {
        return sock.sendMessage(jid, {
          text: '> ❐ El mensaje al que respondiste no contiene un archivo multimedia para leer.'
        }, { quoted: msg })
      }

      // Descargar el medio usando el método que tenga el bot
      let buffer
      if (typeof sock.downloadMediaMessage === 'function') {
        // Método estándar de Baileys: descarga a partir del mensaje completo
        // Necesitamos construir un objeto mensaje simulado que contenga el medio
        const fakeMsg = { message: { [media.type + 'Message']: media.mediaMsg } }
        buffer = await sock.downloadMediaMessage(fakeMsg)
      } else if (typeof sock.downloadM === 'function') {
        // Método alternativo (algunos bots usan downloadM)
        buffer = await sock.downloadM(media.mediaMsg, media.type)
      } else {
        throw new Error('No se encontró un método de descarga disponible en el bot.')
      }

      if (!buffer || !buffer.length) {
        throw new Error('El buffer descargado está vacío.')
      }

      // Construir el payload y enviar
      const payload = buildPayload(buffer, media.mediaMsg, media.type)
      await sock.sendMessage(jid, payload, { quoted: msg })

      // Reacción de éxito
      await sock.sendMessage(jid, { react: { key: msg.key, text: '✔️' } })
    } catch (error) {
      console.error('[VER] Error:', error)
      // Reacción de error
      await sock.sendMessage(jid, { react: { key: msg.key, text: '✖️' } })
      return sock.sendMessage(jid, {
        text: `⚠️ Ocurrió un error al procesar el mensaje.\nDetalle: ${error.message || 'Desconocido'}\n\n> Usa *${config.prefix || '.'}report* para informarlo.`
      }, { quoted: msg })
    }
  }
}