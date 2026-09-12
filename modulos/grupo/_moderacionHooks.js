//CÓDIGO ORIGINAL DE YUIBOT-MD
// Hook de moderación (antilink + antiflood). Antes este código vivía
// hardcodeado dentro de messages.upsert en main.js; se movió acá para
// validar el modelo de hooks (onMessage) sin cambiar el comportamiento.
// A partir de este archivo, cualquier módulo de moderación nuevo
// (antiraid, antifake, antibot, etc.) se agrega como otro hook
// independiente, sin volver a tocar main.js/subbot.js.
//
// Este archivo NO es un comando de chat (no exporta "name"/"execute"):
// el cargador lo detecta por exportar onMessage y lo registra como hook.

const { isOwner } = require('../../lib/handler')
const { contieneLink, detectarFlood, esAdminDeGrupo } = require('../../lib/moderacion')
const { registrarAvisoAntilink, reiniciarAvisosAntilink } = require('../../lib/db')

module.exports = {
  /**
   * @param {object} ctx - { jid, body, esGrupo, remitente, numeroRemitente, config }
   */
  async onMessage(sock, msg, ctx) {
    const { jid, body, esGrupo, remitente, numeroRemitente, config } = ctx

    if (!esGrupo || msg.key.fromMe) return

    const antilinkActivo = config.MODERACION?.ANTILINK?.ENABLED
    const antifloodActivo = config.MODERACION?.ANTIFLOOD?.ENABLED
    if (!antilinkActivo && !antifloodActivo) return

    try {
      const esOwnerBot = isOwner(remitente, config)
      if (esOwnerBot) return

      let metadata = null

      if (antilinkActivo && contieneLink(body)) {
        metadata = metadata || await sock.groupMetadata(jid)
        if (!esAdminDeGrupo(metadata, numeroRemitente)) {
          console.log(`[MODERACION] Link detectado de ${numeroRemitente}, se elimina el mensaje.`)
          await sock.sendMessage(jid, { delete: msg.key })

          const autoKick = config.MODERACION.ANTILINK.AUTO_KICK
          const maxAvisos = config.MODERACION.ANTILINK.MAX_AVISOS || 3

          if (autoKick) {
            const avisos = registrarAvisoAntilink(numeroRemitente)

            if (avisos >= maxAvisos) {
              reiniciarAvisosAntilink(numeroRemitente)
              try {
                await sock.groupParticipantsUpdate(jid, [remitente], 'remove')
                await sock.sendMessage(jid, {
                  text: `🚫 @${numeroRemitente} fue expulsado por enviar enlaces prohibidos ${maxAvisos} veces.`,
                  mentions: [remitente],
                })
              } catch (error) {
                console.error('[MODERACION] No se pudo expulsar (¿el bot es admin?):', error)
                await sock.sendMessage(jid, {
                  text: `🚫 @${numeroRemitente} superó el límite de avisos, pero no pude expulsarlo. ¿Soy administrador del grupo?`,
                  mentions: [remitente],
                })
              }
              return
            }

            await sock.sendMessage(jid, {
              text: `🚫 @${numeroRemitente}, no se permiten enlaces en este grupo. Aviso ${avisos}/${maxAvisos}.`,
              mentions: [remitente],
            })
            return
          }

          await sock.sendMessage(jid, {
            text: `🚫 @${numeroRemitente}, no se permiten enlaces en este grupo.`,
            mentions: [remitente],
          })
          return
        }
      }

      if (antifloodActivo) {
        metadata = metadata || await sock.groupMetadata(jid)
        if (!esAdminDeGrupo(metadata, numeroRemitente) && detectarFlood(numeroRemitente, config.MODERACION.ANTIFLOOD)) {
          console.log(`[MODERACION] Flood detectado de ${numeroRemitente}.`)
          await sock.sendMessage(jid, {
            text: `⚠️ @${numeroRemitente}, estás enviando mensajes muy rápido. Tranquilo un momento.`,
            mentions: [remitente],
          })
        }
      }
    } catch (error) {
      console.error('[MODERACION] Error al procesar antilink/antiflood:', error)
    }
  },
}