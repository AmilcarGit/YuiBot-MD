//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'infogrupo',
  aliases: ['groupinfo', 'ginfo'],
  description: 'Muestra información del grupo actual',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid

    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg })
    }

    let metadata
    try {
      metadata = await sock.groupMetadata(jid)
    } catch (error) {
      console.error('[INFOGRUPO]', error)
      return sock.sendMessage(jid, { text: '❌ No se pudo obtener la información del grupo.' }, { quoted: msg })
    }

    const totalMiembros = metadata.participants.length
    const admins = metadata.participants.filter((p) => p.admin === 'admin' || p.admin === 'superadmin').length
    const creado = metadata.creation ? new Date(metadata.creation * 1000).toLocaleDateString('es-PE') : 'Desconocida'

    let texto = `⛧───「 ${metadata.subject} 」───⛧\n\n`
    texto += `  ❖ id: ${jid.split('@')[0]}\n`
    texto += `  ❖ miembros: ${totalMiembros}\n`
    texto += `  ❖ administradores: ${admins}\n`
    texto += `  ❖ creado: ${creado}\n`
    if (metadata.desc) {
      texto += `\n📝 _Descripción:_\n${metadata.desc}\n`
    }
    texto += `\n╰─➤ _${config.BOT_NAME}_ 🥀`

    let fotoUrl = null
    try {
      fotoUrl = await sock.profilePictureUrl(jid, 'image')
    } catch {
      fotoUrl = null
    }

    if (fotoUrl) {
      try {
        const resp = await fetch(fotoUrl)
        const buffer = Buffer.from(await resp.arrayBuffer())
        return sock.sendMessage(jid, { image: buffer, caption: texto }, { quoted: msg })
      } catch (error) {
        console.error('[INFOGRUPO] No se pudo descargar la foto:', error)
      }
    }

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}