// Código Oficial de YuiBot-MD.by AmilcarGit
// Stickers con sonido de WhatsApp (nov. 2026): Message.audioStickerMessage (campo 134) → .message (1) → stickerMessage (26) → audioMessage (26).
// Las versiones de Baileys/Yui-Bails que no traen esos campos los descartan al codificar, así que se los agrega en memoria
// (sin tocar node_modules) envolviendo los codificadores de protobuf. Es idempotente.
const MARCA = Symbol.for('yuibot.audioSticker')
const TAG_AUDIO_EN_STICKER = (26 << 3) | 2 // StickerMessage.audioMessage
const TAG_SONIDO = (134 << 3) | 2 // Message.audioStickerMessage
const TAG_MENSAJE = (1 << 3) | 2 // FutureProofMessage.message

export function parcharProto(proto) {
  const M = proto?.Message; const S = M?.StickerMessage; const A = M?.AudioMessage
  if (typeof M?.encode !== 'function' || typeof S?.encode !== 'function' || typeof A?.encode !== 'function') {
    throw new Error('sin soporte: esta Yui-Bails no expone los codificadores de protobuf')
  }
  if (M[MARCA]) return
  const codificarSticker = S.encode.bind(S)
  S.encode = function (m, w) {
    const salida = codificarSticker(m, w)
    if (m && m.audioMessage) A.encode(m.audioMessage, salida.uint32(TAG_AUDIO_EN_STICKER).fork()).ldelim()
    return salida
  }
  const codificarMensaje = M.encode.bind(M)
  M.encode = function (m, w) {
    const salida = codificarMensaje(m, w)
    if (m && m.audioStickerMessage && m.audioStickerMessage.message) {
      salida.uint32(TAG_SONIDO).fork()
      salida.uint32(TAG_MENSAJE).fork()
      M.encode(m.audioStickerMessage.message, salida)
      salida.ldelim(); salida.ldelim()
    }
    return salida
  }
  M[MARCA] = true
}

// ── Lector mínimo de protobuf, solo para comprobar lo que se va a enviar ──
function campos(buf) {
  const lista = []; let i = 0
  const varint = () => { let v = 0, s = 0; for (;;) { const b = buf[i++]; if (b === undefined) throw new Error('truncado'); v += (b & 0x7f) * 2 ** s; if (!(b & 0x80)) return v; s += 7 } }
  while (i < buf.length) {
    const clave = varint(); const n = Math.floor(clave / 8); const tipo = clave & 7
    if (tipo === 0) lista.push({ n, valor: varint() })
    else if (tipo === 2) { const largo = varint(); lista.push({ n, datos: buf.subarray(i, i + largo) }); i += largo }
    else if (tipo === 1) i += 8
    else if (tipo === 5) i += 4
    else throw new Error('tipo no soportado')
  }
  return lista
}
const hijo = (buf, n) => campos(buf).find(c => c.n === n && c.datos)?.datos

/** true si los bytes ya codificados llevan un sticker con audio completo (134 → 1 → 26 → 26). */
export function contieneStickerSonido(bytes) {
  try {
    const envoltura = hijo(Buffer.from(bytes), 134); const mensaje = envoltura && hijo(envoltura, 1)
    const sticker = mensaje && hijo(mensaje, 26); const audio = sticker && hijo(sticker, 26)
    return Boolean(audio && audio.length > 0 && hijo(sticker, 1))
  } catch { return false }
}
