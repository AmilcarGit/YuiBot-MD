// Código Oficial de YuiBot-MD.by AmilcarGit
// Utilidades compartidas por .s y .saudio: encontrar el archivo del mensaje (o del que se responde) y mandar el sticker.
const quitarEnvoltura = c => c?.ephemeralMessage?.message || c?.viewOnceMessage?.message || c?.viewOnceMessageV2?.message
  || c?.viewOnceMessageV2Extension?.message || c?.documentWithCaptionMessage?.message || c

const TIPOS = ['imageMessage', 'videoMessage', 'stickerMessage', 'audioMessage', 'documentMessage']

/** Devuelve { tipo, nodo, mensaje } con el archivo adjunto al mensaje o al que se responde; null si no hay. */
export function buscarMedio(m, jid) {
  const propio = quitarEnvoltura(m.message)
  const candidatos = []
  if (propio) candidatos.push({ contenido: propio, clave: m.key })
  const info = Object.values(propio || {}).map(v => v?.contextInfo).find(Boolean)
  const citado = quitarEnvoltura(info?.quotedMessage)
  if (citado) candidatos.push({ contenido: citado, clave: { remoteJid: jid, id: info.stanzaId, participant: info.participant, fromMe: false } })
  for (const { contenido, clave } of candidatos) {
    const tipo = TIPOS.find(t => contenido[t])
    if (!tipo) continue
    if (tipo === 'documentMessage' && !/^(image|video|audio)\//.test(contenido.documentMessage.mimetype || '')) continue
    return { tipo, nodo: contenido[tipo], mensaje: { key: clave, message: contenido } }
  }
  return null
}

export async function descargar(sock, medio) {
  const yb = await import('yui-bails')
  const bajar = yb.downloadMediaMessage || yb.default?.downloadMediaMessage
  if (!bajar) throw new Error('Esta versión del bot no sabe descargar archivos.')
  const buffer = await bajar(medio.mensaje, 'buffer', {}, { reuploadRequest: sock.updateMediaMessage })
  if (!buffer?.length) throw new Error('No pude descargar el archivo.')
  return buffer
}

// Una conversión a la vez por persona: ffmpeg consume mucho en un hosting pequeño.
const ocupados = new Set()
export const tomarTurno = id => (ocupados.has(id) ? false : (ocupados.add(id), true))
export const soltarTurno = id => ocupados.delete(id)

/**
 * Sticker con sonido: mensaje de sticker con un audio adjunto (audioStickerMessage de WhatsApp).
 * Si esta versión de Yui-Bails no lo conoce, se manda el sticker y el audio por separado.
 * Devuelve 'con-sonido' o 'separado'.
 */
export async function enviarStickerSonido(sock, jid, webp, ogg, segundos, opciones = {}) {
  try {
    const yb = await import('yui-bails')
    const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = { ...yb.default, ...yb }
    if (!prepareWAMessageMedia || !generateWAMessageFromContent || !proto?.Message) throw new Error('sin soporte')
    const subir = { upload: sock.waUploadToServer }
    const st = await prepareWAMessageMedia({ sticker: webp }, subir)
    const au = await prepareWAMessageMedia({ audio: ogg, mimetype: 'audio/ogg; codecs=opus', ptt: false, seconds: Math.ceil(segundos) }, subir)
    const contenido = { audioStickerMessage: { message: { stickerMessage: { ...st.stickerMessage, audioMessage: au.audioMessage } } } }
    // Si el protocolo de esta versión no trae el campo, se perdería en silencio: se comprueba antes de enviar.
    const ida = proto.Message.decode(proto.Message.encode(proto.Message.fromObject(contenido)).finish())
    if (!ida.audioStickerMessage?.message?.stickerMessage?.audioMessage) throw new Error('sin soporte')
    const msg = generateWAMessageFromContent(jid, contenido, { quoted: opciones.quoted, userJid: sock.user?.id })
    await sock.relayMessage(jid, msg.message, { messageId: msg.key.id })
    return 'con-sonido'
  } catch (error) {
    console.error(`sticker con sonido: ${error.message}`)
    await sock.sendMessage(jid, { sticker: webp }, opciones)
    await sock.sendMessage(jid, { audio: ogg, mimetype: 'audio/ogg; codecs=opus', ptt: false }, opciones)
    return 'separado'
  }
}
