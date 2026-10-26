const { exigirAdmin } = require('../../lib/adminGrupo')
const { caja, error } = require('../../lib/estilo')

module.exports = {
  name: 'cerrar',
  aliases: ['closegroup', 'silenciargrupo'],
  description: 'Cierra el grupo: solo los admins pueden escribir',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const ctx = await exigirAdmin(sock, msg, config, { botAdmin: true })
    if (!ctx) return
    try {
      await sock.groupSettingUpdate(ctx.jid, 'announcement')
      return sock.sendMessage(ctx.jid, { text: caja('🔒', 'Grupo cerrado', [['Estado', 'Solo los admins pueden escribir']], 'Chat restringido') }, { quoted: msg })
    } catch (e) {
      return sock.sendMessage(ctx.jid, { text: error('No pude cerrar el grupo.') }, { quoted: msg })
    }
  },
}
