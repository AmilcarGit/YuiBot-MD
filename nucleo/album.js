// Código Oficial de YuiBot-MD.by AmilcarGit
// Álbum de WhatsApp: varias imágenes juntas en una sola burbuja (albumMessage + cada imagen asociada a ese álbum).
// Si esta Yui-Bails no conoce los álbumes, se envían las imágenes una por una.
const pausa = ms => new Promise(r => setTimeout(r, ms))
const MAX_BYTES = 6 * 1024 * 1024

async function bajar(item) {
  try {
    const r = await fetch(item.url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!r.ok) return null
    const buffer = Buffer.from(await r.arrayBuffer())
    return buffer.length && buffer.length <= MAX_BYTES ? { buffer, caption: item.caption || '' } : null
  } catch { return null }
}

/** Envía las imágenes como álbum nativo. Lanza un error con motivo si no se pudo (sin haber enviado nada). */
export async function albumNativo(sock, jid, items, opciones = {}, libreria = null) {
  const yb = libreria || await import('yui-bails')
  const { generateWAMessageFromContent, generateWAMessage, proto } = { ...yb.default, ...yb }
  if (typeof generateWAMessageFromContent !== 'function' || typeof generateWAMessage !== 'function' || !proto?.Message) throw new Error('sin soporte: la librería no exporta lo necesario para álbumes')
  // Si el protocolo no trae estos campos, se perderían en silencio y saldrían imágenes sueltas: se comprueba antes.
  const llave = { id: 'PRUEBA', remoteJid: jid, fromMe: true }
  const ida = proto.Message.decode(proto.Message.encode(proto.Message.fromObject({ messageContextInfo: { messageAssociation: { associationType: 1, parentMessageKey: llave } }, albumMessage: { expectedImageCount: 2 } })).finish())
  if (!ida.albumMessage || !ida.messageContextInfo?.messageAssociation) throw new Error('sin soporte: esta Yui-Bails no conoce los álbumes')
  const listas = (await Promise.all(items.map(bajar))).filter(Boolean)
  if (listas.length < 2) throw new Error('no pude bajar suficientes imágenes para el álbum')
  const subir = sock.waUploadToServer
  const album = generateWAMessageFromContent(jid, { messageContextInfo: {}, albumMessage: { expectedImageCount: listas.length, expectedVideoCount: 0 } }, { userJid: sock.user?.id, quoted: opciones.quoted, upload: subir })
  await sock.relayMessage(jid, album.message, { messageId: album.key.id })
  let enviadas = 0
  for (const it of listas) {
    try {
      const msg = await generateWAMessage(jid, { image: it.buffer, caption: it.caption }, { upload: subir })
      msg.message.messageContextInfo = { messageAssociation: { associationType: 1, parentMessageKey: album.key } }
      await sock.relayMessage(jid, msg.message, { messageId: msg.key.id })
      enviadas++; await pausa(250)
    } catch (error) { console.error(`álbum: una imagen falló: ${error.message}`) }
  }
  return enviadas
}

/** Una sola llamada para los comandos: álbum nativo, o imágenes sueltas si no se puede; en la web, una galería. */
export async function enviarImagenes(ctx, m, items) {
  if (ctx.web) return ctx.enviar({ album: items })
  if (items.length > 1) {
    try { return await albumNativo(ctx.sock, ctx.jid, items, { quoted: m }) } catch (error) { console.error(`álbum: ${error.message}`) }
  }
  for (const it of items) await ctx.enviar({ image: { url: it.url }, caption: it.caption }, { quoted: m })
}
