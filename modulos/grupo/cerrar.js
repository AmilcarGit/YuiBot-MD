const { exigirAdmin } = require('../../lib/adminGrupo')

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
      return sock.sendMessage(ctx.jid, { text: '🔒 Grupo cerrado: solo los admins pueden escribir.' }, { quoted: msg })
    } catch (e) {
      return sock.sendMessage(ctx.jid, { text: '❌ No pude cerrar el grupo.' }, { quoted: msg })
    }
  },
}
