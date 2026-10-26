const { exigirAdmin } = require('../../lib/adminGrupo')
const { caja, error } = require('../../lib/estilo')

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
      return sock.sendMessage(ctx.jid, { text: caja('🔓', 'Grupo abierto', [['Estado', 'Todos pueden escribir']], 'Chat habilitado') }, { quoted: msg })
    } catch (e) {
      return sock.sendMessage(ctx.jid, { text: error('No pude abrir el grupo.') }, { quoted: msg })
    }
  },
}
