// Hook del escudo de grupo (antidelete · antispam · antiflood · antilink por grupo + silencios).
// No es un comando: lo registra el cargador por exportar onMessage.
const { isOwner } = require('../../lib/handler')
const { esAdminDeGrupo } = require('../../lib/moderacion')
const { estaEnWhitelist } = require('../../lib/whitelist')
const E = require('../../lib/escudo')

const REVOCAR = new Set([0, 'REVOKE'])
const sinContenido = (m) => !m?.message || m.message.protocolMessage || m.message.reactionMessage || m.message.senderKeyDistributionMessage

async function borrar(sock, jid, msg) { try { await sock.sendMessage(jid, { delete: msg.key }); return true } catch { return false } }

async function reenviarBorrado(sock, jid, msg, orig) {
  const autor = orig.key.participantAlt || orig.key.participant || ''
  const num = autor.split('@')[0].split(':')[0]
  const quien = msg.key.participantAlt || msg.key.participant || ''
  const borro = quien.split('@')[0].split(':')[0]
  const aviso = borro && num && borro !== num ? `🗑️ @${borro} borró un mensaje de @${num}:` : `🗑️ @${num || 'alguien'} borró este mensaje:`
  const menciones = [autor, quien].filter(Boolean)
  const contenido = orig.message?.conversation || orig.message?.extendedTextMessage?.text
  if (contenido) return sock.sendMessage(jid, { text: `${aviso}\n\n${contenido}`, mentions: menciones })
  await sock.sendMessage(jid, { text: aviso, mentions: menciones })
  await sock.sendMessage(jid, { forward: orig })
}

async function castigar(sock, jid, msg, ctx, motivo) {
  const { remitente, numeroRemitente } = ctx
  await borrar(sock, jid, msg)
  const s = E.sancionar(jid, numeroRemitente)
  const mencion = { mentions: [remitente] }
  if (s.accion === 'expulsar') {
    try {
      await sock.groupParticipantsUpdate(jid, [remitente], 'remove')
      await sock.sendMessage(jid, { text: `🚫 @${numeroRemitente} fue expulsado: reincidió (${motivo}).`, ...mencion })
    } catch {
      await sock.sendMessage(jid, { text: `🚫 @${numeroRemitente} llegó al límite (${motivo}), pero no pude expulsarlo. ¿Soy administrador?`, ...mencion })
    }
  } else if (s.accion === 'silencio') {
    await sock.sendMessage(jid, { text: `🔇 @${numeroRemitente} queda en silencio ${E.textoDuracion(s.ms)} por ${motivo}. Sus mensajes se borrarán.`, ...mencion })
  } else {
    await sock.sendMessage(jid, { text: `⚠️ @${numeroRemitente}, ${motivo}. Aviso ${s.puntos}/${s.total}${s.ultimo ? ' · el siguiente castigo es un silencio' : ''}.`, ...mencion })
  }
  return true
}

module.exports = {
  async onMessage(sock, msg, ctx) {
    const { jid, body, esGrupo, config } = ctx
    if (!esGrupo || !msg?.key) return

    const cfg = E.configGrupo(jid)

    // Alguien borró un mensaje → antidelete.
    const proto = msg.message?.protocolMessage
    if (proto && REVOCAR.has(proto.type)) {
      if (cfg.antidelete && proto.key?.id) {
        const orig = E.buscarMensaje(jid, proto.key.id)
        if (orig && !orig.key.fromMe && !msg.key.fromMe) { try { await reenviarBorrado(sock, jid, msg, orig) } catch (e) { console.error('[ESCUDO] antidelete:', e.message) } }
      }
      return
    }
    if (msg.key.fromMe || sinContenido(msg)) return

    if (cfg.antidelete) E.guardarMensaje(jid, msg)

    const { numeroRemitente } = ctx
    const silencio = E.restanteSilencio(jid, numeroRemitente)
    if (!silencio && !E.FUNCIONES.some((f) => cfg[f])) return
    if (isOwner(ctx.remitente, config) || estaEnWhitelist(jid, numeroRemitente)) return

    let metadata
    try { metadata = await sock.groupMetadata(jid) } catch { return }
    if (esAdminDeGrupo(metadata, numeroRemitente)) return

    try {
      // Silenciado: el bot borra cada mensaje suyo (y no deja pasar comandos).
      if (silencio) { await borrar(sock, jid, msg); return true }

      if (cfg.antilink && E.tieneEnlace(body)) return castigar(sock, jid, msg, ctx, 'enviar enlaces')
      if (cfg.antispam && E.detectarSpam(`${jid}:${numeroRemitente}`, body)) { E.limpiarDetectores(`${jid}:${numeroRemitente}`); return castigar(sock, jid, msg, ctx, 'repetir el mismo mensaje') }
      if (cfg.antiflood && E.detectarRafaga(`${jid}:${numeroRemitente}`)) { E.limpiarDetectores(`${jid}:${numeroRemitente}`); return castigar(sock, jid, msg, ctx, 'escribir demasiado rápido') }
    } catch (e) {
      console.error('[ESCUDO] Error:', e)
    }
  },
}
