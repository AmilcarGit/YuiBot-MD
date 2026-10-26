//CÓDIGO ORIGINAL DE YUIBOT-MD
const { caja } = require('../../lib/estilo')
const fetch = require('../../lib/http').fetchSeguro // timeout por defecto (ver lib/http.js)
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

    const texto = caja('👥', metadata.subject, [
      ['ID', jid.split('@')[0], '🆔'],
      ['Miembros', totalMiembros, '👤'],
      ['Administradores', admins, '🛡️'],
      ['Creado', creado, '📅'],
      metadata.desc ? ['Descripción', `\n${metadata.desc}`, '📝'] : null,
    ], config.BOT_NAME)

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