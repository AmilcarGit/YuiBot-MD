const { exigirAdmin } = require('../../lib/adminGrupo')
const { caja, error } = require('../../lib/estilo')

module.exports = {
  name: 'nombregrupo',
  aliases: ['cambiarnombre'],
  description: 'Cambia el nombre del grupo',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const ctx = await exigirAdmin(sock, msg, config, { botAdmin: true })
    if (!ctx) return
    const nombre = args.join(' ').trim()
    if (!nombre) return sock.sendMessage(ctx.jid, { text: `❌ Escribe el nuevo nombre.\n📌 Ejemplo: ${config.PREFIXES[0]}nombregrupo Los Cracks` }, { quoted: msg })
    if (nombre.length > 25) return sock.sendMessage(ctx.jid, { text: '❌ El nombre no puede pasar de 25 caracteres.' }, { quoted: msg })
    try {
      await sock.groupUpdateSubject(ctx.jid, nombre)
      return sock.sendMessage(ctx.jid, { text: caja('✏️', 'Nombre actualizado', [['Nuevo nombre', nombre]]) }, { quoted: msg })
    } catch (e) {
      return sock.sendMessage(ctx.jid, { text: error('No pude cambiar el nombre.') }, { quoted: msg })
    }
  },
}
