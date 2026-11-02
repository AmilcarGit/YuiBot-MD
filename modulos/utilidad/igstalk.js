const { num, si, enviar, delirius, caja, uso, recortar } = require('../../lib/perfilesDelirius')

module.exports = {
  name: 'igstalk',
  aliases: ['instastalk', 'instagramstalk', 'iguser'],
  description: 'Perfil público de Instagram: .igstalk <usuario>',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const usuario = args.join(' ').trim().replace(/^@/, '')
    if (!usuario) return sock.sendMessage(jid, { text: uso(config.PREFIXES[0], 'igstalk', 'instagram', 'Escribe el usuario de Instagram.') }, { quoted: msg })

    try {
      const p = await delirius.instagramPerfil(usuario)
      const caption =
        caja('📸', 'Instagram', [
          ['Usuario', `@${p.usuario || usuario}`, '👤'],
          ['Nombre', p.nombre, '🏷️'],
          ['Categoría', p.categoria, '🗂️'],
          ['Publicaciones', num(p.publicaciones), '🖼️'],
          ['Seguidores', num(p.seguidores), '👥'],
          ['Siguiendo', num(p.siguiendo), '➕'],
          ['Verificado', si(p.verificado), '✔️'],
          ['Cuenta privada', si(p.privada), '🔒'],
          p.negocio ? ['Negocio', 'Sí', '💼'] : null,
          p.creador ? ['Creador', 'Sí', '🎨'] : null,
          p.pronombres ? ['Pronombres', p.pronombres, '💬'] : null,
        ]) +
        (p.bio ? `\n\n📝 ${recortar(p.bio, 300)}` : '') +
        (p.web ? `\n🌐 ${p.web}` : '') +
        `\n\n🔗 ${p.url || `https://www.instagram.com/${usuario}`}`
      await enviar(sock, msg, null, caption)
    } catch (error) {
      console.error('[IGSTALK]', error)
      await sock.sendMessage(jid, { text: `❌ No pude obtener ese perfil de Instagram.\n\n> ${error.message}` }, { quoted: msg })
    }
  },
}
