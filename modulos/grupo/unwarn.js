const { exigirAdmin, objetivoDe, quitarWarn } = require('../../lib/adminGrupo')

module.exports = {
  name: 'unwarn',
  aliases: ['quitarwarn', 'perdonar'],
  description: 'Quita una advertencia (cita o menciona)',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const ctx = await exigirAdmin(sock, msg, config)
    if (!ctx) return
    const objetivo = objetivoDe(msg, args)
    if (!objetivo) return sock.sendMessage(ctx.jid, { text: '❌ Cita o menciona a la persona.' }, { quoted: msg })
    const resto = quitarWarn(ctx.jid, objetivo)
    if (resto === null) return sock.sendMessage(ctx.jid, { text: '✅ Esa persona no tiene advertencias.' }, { quoted: msg })
    return sock.sendMessage(ctx.jid, { text: `✅ Advertencia quitada a @${objetivo}. Le quedan ${resto}.`, mentions: [`${objetivo}@s.whatsapp.net`] }, { quoted: msg })
  },
}
