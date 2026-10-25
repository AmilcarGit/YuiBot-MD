const { exigirAdmin } = require('../../lib/adminGrupo')

module.exports = {
  name: 'hidetag',
  aliases: ['notificar', 'avisar'],
  description: 'Menciona a todos sin mostrar la lista (admins)',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const ctx = await exigirAdmin(sock, msg, config)
    if (!ctx) return
    const texto = args.join(' ').trim() || '📢 Atención'
    return sock.sendMessage(ctx.jid, { text: texto, mentions: ctx.metadata.participants.map((p) => p.id) })
  },
}
