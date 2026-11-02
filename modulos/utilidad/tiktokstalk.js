const { num, si, enviar, delirius, caja, uso, recortar } = require('../../lib/perfilesDelirius')

module.exports = {
  name: 'tiktokstalk',
  aliases: ['ttstalk', 'tkstalk', 'tiktokuser'],
  description: 'Perfil público de TikTok: .tiktokstalk <usuario>',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const usuario = args.join(' ').trim().replace(/^@/, '')
    if (!usuario) return sock.sendMessage(jid, { text: uso(config.PREFIXES[0], 'tiktokstalk', 'twice_tiktok_official', 'Escribe el usuario de TikTok.') }, { quoted: msg })

    try {
      const p = await delirius.tiktokPerfil(usuario)
      const caption =
        caja('🎵', 'TikTok', [
          ['Usuario', `@${p.usuario}`, '👤'],
          ['Nombre', p.nombre, '🏷️'],
          ['Seguidores', num(p.seguidores), '👥'],
          ['Siguiendo', num(p.siguiendo), '➕'],
          ['Me gusta', num(p.likes), '❤️'],
          ['Videos', num(p.videos), '🎬'],
          ['Verificado', si(p.verificado), '✔️'],
          ['Cuenta privada', si(p.privada), '🔒'],
        ]) +
        (p.bio ? `\n\n📝 ${recortar(p.bio, 300)}` : '') +
        (p.url ? `\n\n🔗 ${p.url}` : '')
      await enviar(sock, msg, p.foto, caption)
    } catch (error) {
      console.error('[TIKTOKSTALK]', error)
      await sock.sendMessage(jid, { text: `❌ No pude obtener ese perfil de TikTok.\n\n> ${error.message}` }, { quoted: msg })
    }
  },
}
