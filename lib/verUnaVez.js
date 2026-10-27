// Revela fotos, videos y audios de "ver una vez" cuando se responde a ellos.
const TIPOS = [
  ['imageMessage', 'image'],
  ['videoMessage', 'video'],
  ['audioMessage', 'audio'],
]

// WhatsApp envuelve estos mensajes de varias formas según la versión.
function desenvolver(m) {
  let actual = m
  for (let i = 0; i < 4 && actual; i++) {
    const interno = actual.viewOnceMessage?.message || actual.viewOnceMessageV2?.message || actual.viewOnceMessageV2Extension?.message || actual.ephemeralMessage?.message || actual.documentWithCaptionMessage?.message
    if (!interno) break
    actual = { ...interno, __vistaUnica: true }
  }
  return actual
}

/** Del mensaje al que se respondió → { tipo, mensaje, vistaUnica } o null. */
function extraerMedia(msg) {
  const citado = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    || msg.message?.imageMessage?.contextInfo?.quotedMessage
    || msg.message?.videoMessage?.contextInfo?.quotedMessage
  if (!citado) return null
  const plano = desenvolver(citado)
  for (const [campo, tipo] of TIPOS) {
    if (plano[campo]) return { tipo, mensaje: plano[campo], vistaUnica: Boolean(plano.__vistaUnica || plano[campo].viewOnce) }
  }
  return null
}

async function descargar(media, descargador) {
  const bajar = descargador || require('@whiskeysockets/baileys').downloadContentFromMessage
  const stream = await bajar(media.mensaje, media.tipo)
  const partes = []
  for await (const chunk of stream) partes.push(chunk)
  const buffer = Buffer.concat(partes)
  if (!buffer.length) throw new Error('El archivo ya no está disponible en los servidores de WhatsApp.')
  return buffer
}

/** Contenido listo para sock.sendMessage. */
function aContenido(media, buffer, pie) {
  const m = media.mensaje
  const caption = [pie, m.caption].filter(Boolean).join('\n')
  if (media.tipo === 'image') return { image: buffer, caption }
  if (media.tipo === 'video') return { video: buffer, caption, ...(m.gifPlayback ? { gifPlayback: true } : {}) }
  return { audio: buffer, mimetype: m.mimetype || 'audio/ogg; codecs=opus', ptt: Boolean(m.ptt) }
}

module.exports = { extraerMedia, descargar, aContenido, desenvolver }
