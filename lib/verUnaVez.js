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

const tieneClave = (nodo) => Boolean(nodo?.mediaKey && nodo.mediaKey.length)

// Al responder a un "ver una vez", WhatsApp manda la cita SIN la clave para abrirlo.
// Por eso el bot guarda (en memoria) los "ver una vez" cuando LLEGAN, y luego los busca por id.
const guardados = new Map() // `${chat}|${id}` → { tipo, mensaje, vistaUnica, hora }
const MAX_GUARDADOS = 300
const VIDA_MS = 24 * 60 * 60 * 1000

/** Se llama con cada mensaje recibido: guarda los de "ver una vez" que traen su clave. Devuelve true si guardó. */
function guardar(msg, ahora = Date.now()) {
  const id = msg?.key?.id
  if (!id || !msg.message) return false
  const plano = desenvolver(msg.message)
  for (const [campo, tipo] of TIPOS) {
    const nodo = plano[campo]
    if (!nodo) continue
    if (!(plano.__vistaUnica || nodo.viewOnce) || !tieneClave(nodo)) return false
    guardados.set(`${msg.key.remoteJid}|${id}`, { tipo, mensaje: nodo, vistaUnica: true, hora: ahora })
    if (guardados.size > MAX_GUARDADOS) guardados.delete(guardados.keys().next().value)
    return true
  }
  return false
}

const buscarGuardado = (chat, id, ahora = Date.now()) => {
  const g = id && guardados.get(`${chat}|${id}`)
  return g && ahora - g.hora < VIDA_MS ? g : null
}

/** Del mensaje al que se respondió → { tipo, mensaje, vistaUnica, sinClave? } o null. */
function extraerMedia(msg) {
  const contexto = msg.message?.extendedTextMessage?.contextInfo
    || msg.message?.imageMessage?.contextInfo
    || msg.message?.videoMessage?.contextInfo
  const citado = contexto?.quotedMessage
  if (!citado) return null
  const plano = desenvolver(citado)
  for (const [campo, tipo] of TIPOS) {
    if (!plano[campo]) continue
    const media = { tipo, mensaje: plano[campo], vistaUnica: Boolean(plano.__vistaUnica || plano[campo].viewOnce) }
    if (tieneClave(media.mensaje)) return media
    const guardado = buscarGuardado(msg.key?.remoteJid, contexto.stanzaId)
    return guardado ? { ...guardado } : { ...media, sinClave: true }
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

module.exports = { extraerMedia, descargar, aContenido, desenvolver, guardar, _guardados: guardados }
