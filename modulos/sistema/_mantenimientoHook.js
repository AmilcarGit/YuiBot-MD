//CÓDIGO ORIGINAL DE YUIBOT-MD
// Hook de mantenimiento global. Se nombra con "_" y empieza con "_m..."
// para que el cargador lo ejecute ANTES que los demás hooks de moderación
// (orden alfabético de archivos) — si el bot está en mantenimiento, no
// tiene sentido seguir evaluando antilink/antiflood/etc. para ese mensaje.

const { isOwner, parseCommand } = require('../../lib/handler')
const modoMantenimiento = require('../../lib/modoMantenimiento')

const COOLDOWN_AVISO_MS = 30 * 1000
const ultimoAviso = new Map()

module.exports = {
  async onMessage(sock, msg, ctx) {
    const { jid, body, remitente, config, commands } = ctx
    if (msg.key.fromMe) return
    if (!modoMantenimiento.estaActivo()) return
    if (isOwner(remitente, config)) return // el owner sigue usando el bot normal para poder desactivarlo

    const parsed = parseCommand(body, config)
    if (!parsed) return // charla normal no se toca
    if (!(commands instanceof Map) || !commands.get(parsed.commandName)) return

    const key = `${jid}|${remitente}`
    const ahora = Date.now()
    if (ahora > (ultimoAviso.get(key) || 0)) {
      ultimoAviso.set(key, ahora + COOLDOWN_AVISO_MS)
      try {
        await sock.sendMessage(jid, { text: modoMantenimiento.obtenerMensaje() })
      } catch (error) {
        console.error('[MANTENIMIENTO] Error avisando modo mantenimiento:', error)
      }
    }

    return true
  },
}