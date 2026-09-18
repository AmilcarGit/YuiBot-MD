//CÓDIGO ORIGINAL DE YUIBOT-MD
const modoMantenimiento = require('../../lib/modoMantenimiento')

module.exports = {
  name: 'mantenimiento',
  aliases: ['maintenance'],
  description: 'Activa/desactiva el modo mantenimiento global del bot',
  category: 'sistema',
  ownerOnly: true,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const accion = (args[0] || '').toLowerCase()

    if (accion === 'on') {
      const mensaje = args.slice(1).join(' ').trim()
      modoMantenimiento.activar(mensaje)
      return sock.sendMessage(jid, {
        text: `🛠️ Modo mantenimiento *activado*.\nMensaje que verán los demás:\n\n${modoMantenimiento.obtenerMensaje()}`,
      }, { quoted: msg })
    }

    if (accion === 'off') {
      modoMantenimiento.desactivar()
      return sock.sendMessage(jid, { text: '✅ Modo mantenimiento desactivado. El bot vuelve a responder a todos.' }, { quoted: msg })
    }

    return sock.sendMessage(jid, {
      text: `🛠️ *MODO MANTENIMIENTO*\n\nEstado: *${modoMantenimiento.estaActivo() ? 'ON 🔴' : 'OFF 🟢'}*\nMensaje actual: ${modoMantenimiento.obtenerMensaje()}\n\nmantenimiento on <mensaje opcional>\nmantenimiento off`,
    }, { quoted: msg })
  },
}