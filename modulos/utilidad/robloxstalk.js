const { num, si, enviar, delirius, caja, uso, recortar } = require('../../lib/perfilesDelirius')

module.exports = {
  name: 'robloxstalk',
  aliases: ['roblox', 'rbx', 'robloxuser'],
  description: 'Perfil público de Roblox: .robloxstalk <usuario>',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const usuario = args.join(' ').trim()
    if (!usuario) return sock.sendMessage(jid, { text: uso(config.PREFIXES[0], 'robloxstalk', 'nayeonyny', 'Escribe el usuario de Roblox.') }, { quoted: msg })

    try {
      const p = await delirius.robloxPerfil(usuario)
      const juegos = p.juegos.slice(0, 5).map((g) => `🎮 ${recortar(g.nombre, 40)} · 👥 ${num(g.jugando)}`).join('\n')
      const caption =
        caja('🧱', 'Roblox', [
          ['Usuario', `@${p.usuario}`, '👤'],
          p.nombre && p.nombre !== p.usuario ? ['Nombre', p.nombre, '🏷️'] : null,
          ['ID', p.id, '🆔'],
          ['Seguidores', num(p.seguidores), '👥'],
          ['Siguiendo', num(p.siguiendo), '➕'],
          ['Amigos', num(p.amigos), '🤝'],
          ['Verificado', si(p.verificado), '✔️'],
          ['Baneado', p.baneado ? 'Sí 🚫' : 'No', '🛡️'],
          ['Estado', p.estado, '📌'],
          ['Creada', p.creada, '📅'],
          ['Última vez', p.ultimaVez, '🕒'],
        ]) +
        (p.descripcion ? `\n\n📝 ${recortar(p.descripcion, 300)}` : '') +
        (juegos ? `\n\n*Juegos creados*\n${juegos}` : '') +
        (p.url ? `\n\n🔗 ${p.url}` : '')
      await enviar(sock, msg, p.foto, caption)
    } catch (error) {
      console.error('[ROBLOXSTALK]', error)
      await sock.sendMessage(jid, { text: `❌ No pude obtener ese perfil de Roblox.\n\n> ${error.message}` }, { quoted: msg })
    }
  },
}
