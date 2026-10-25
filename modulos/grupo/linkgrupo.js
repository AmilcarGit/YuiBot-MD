const { exigirAdmin } = require('../../lib/adminGrupo')

module.exports = {
  name: 'linkgrupo',
  aliases: ['enlacegrupo', 'invitacion'],
  description: 'Muestra el enlace de invitación del grupo (-r lo restablece)',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const ctx = await exigirAdmin(sock, msg, config, { botAdmin: true })
    if (!ctx) return
    const reset = args.some((a) => ['-r', 'reset', 'revocar'].includes(a.toLowerCase()))
    try {
      const codigo = reset ? await sock.groupRevokeInvite(ctx.jid) : await sock.groupInviteCode(ctx.jid)
      return sock.sendMessage(ctx.jid, { text: `${reset ? '♻️ Enlace restablecido:' : '🔗 Enlace del grupo:'}\nhttps://chat.whatsapp.com/${codigo}` }, { quoted: msg })
    } catch (e) {
      return sock.sendMessage(ctx.jid, { text: '❌ No pude obtener el enlace.' }, { quoted: msg })
    }
  },
}
