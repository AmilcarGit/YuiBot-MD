const { exigirAdmin } = require('../../lib/adminGrupo')

module.exports = {
  name: 'abrir',
  aliases: ['opengroup', 'abrirgrupo'],
  description: 'Abre el grupo: todos pueden escribir',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const ctx = await exigirAdmin(sock, msg, config, { botAdmin: true })
    if (!ctx) return
    try {
      await sock.groupSettingUpdate(ctx.jid, 'not_announcement')
      return sock.sendMessage(ctx.jid, { text: '🔓 Grupo abierto: todos pueden escribir.' }, { quoted: msg })
    } catch (e) {
      return sock.sendMessage(ctx.jid, { text: '❌ No pude abrir el grupo.' }, { quoted: msg })
    }
  },
}
