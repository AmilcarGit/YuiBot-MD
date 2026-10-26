//CÓDIGO ORIGINAL DE YUIBOT-MD
const { caja } = require('../../lib/estilo')
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
        text: caja('🛠️', 'Mantenimiento', [['Estado', '🔴 Activado'], ['Mensaje', modoMantenimiento.obtenerMensaje()]], 'Este es el mensaje que verán los demás'),
      }, { quoted: msg })
    }

    if (accion === 'off') {
      modoMantenimiento.desactivar()
      return sock.sendMessage(jid, { text: '✅ Modo mantenimiento desactivado. El bot vuelve a responder a todos.' }, { quoted: msg })
    }

    return sock.sendMessage(jid, {
      text: caja('🛠️', 'Modo mantenimiento', [['Estado', modoMantenimiento.estaActivo() ? 'ON 🔴' : 'OFF 🟢'], ['Mensaje actual', modoMantenimiento.obtenerMensaje()], '', 'mantenimiento on <mensaje opcional>', 'mantenimiento off'], 'YuiBot-MD'),
    }, { quoted: msg })
  },
}