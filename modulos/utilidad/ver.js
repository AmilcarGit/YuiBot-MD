// COMANDO PARA LEER MENSAJES DE UNA SOLA VISTA (VIEW ONCE)
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

    // Obtener el mensaje citado
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted) {
      return sock.sendMessage(jid, {
        text: '> ♧ Por favor, responde a un mensaje de una sola vista para ver su contenido.'
      }, { quoted: msg })
    }

    try {
      await sock.sendMessage(jid, { react: { key: msg.key, text: '🕒' } })

      const media = getMedia(quoted)
      if (!media) {
        return sock.sendMessage(jid, {
          text: '> ❐ El mensaje al que respondiste no contiene un archivo multimedia para leer.'
        }, { quoted: msg })
      }

      const buffer = await sock.downloadM(media.mediaMsg, media.type)
      if (!buffer || !buffer.length) {
        return sock.sendMessage(jid, {
          text: '✦ Lo sentimos, no se pudo cargar el contenido.'
        }, { quoted: msg })
      }

      const payload = buildPayload(buffer, media.mediaMsg, media.type)
      await sock.sendMessage(jid, payload, { quoted: msg })

      await sock.sendMessage(jid, { react: { key: msg.key, text: '✔️' } })
    } catch (e) {
      await sock.sendMessage(jid, { react: { key: msg.key, text: '✖️' } })
      return sock.sendMessage(jid, {
        text: `⚠︎ Se ha producido un problema.\n> Usa *${config.prefix || ''}report* para informarlo.\n\n${e.message}`
      }, { quoted: msg })
    }
  }
}