const { exigirAdmin } = require('../../lib/adminGrupo')
const { caja, error } = require('../../lib/estilo')

module.exports = {
  name: 'descgrupo',
  aliases: ['setdesc', 'descripciongrupo'],
  description: 'Cambia la descripción del grupo',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const ctx = await exigirAdmin(sock, msg, config, { botAdmin: true })
    if (!ctx) return
    const texto = args.join(' ').trim()
    if (!texto) return sock.sendMessage(ctx.jid, { text: `❌ Escribe la nueva descripción.\n📌 Ejemplo: ${config.PREFIXES[0]}descgrupo Normas: respeto ante todo` }, { quoted: msg })
    try {
      await sock.groupUpdateDescription(ctx.jid, texto.slice(0, 2048))
      return sock.sendMessage(ctx.jid, { text: caja('📝', 'Descripción actualizada', [['Grupo', 'Nueva descripción guardada']]) }, { quoted: msg })
    } catch (e) {
      return sock.sendMessage(ctx.jid, { text: error('No pude cambiar la descripción.') }, { quoted: msg })
    }
  },
}
