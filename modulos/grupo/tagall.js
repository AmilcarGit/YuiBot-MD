//CÓDIGO ORIGINAL DE YUIBOT-MD
const { caja } = require('../../lib/estilo')
module.exports = {
  name: 'tagall',
  aliases: ['everyone', 'all'],
  description: 'Menciona a todos los integrantes del grupo (solo admins)',
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
      console.error('[TAGALL]', error)
      return sock.sendMessage(jid, { text: '❌ No se pudo obtener la información del grupo.' }, { quoted: msg })
    }

    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numeroRemitente = remitente.split('@')[0].split(':')[0]

    const participante = metadata.participants.find((p) => p.id.split('@')[0].split(':')[0] === numeroRemitente)
    const esAdmin = participante?.admin === 'admin' || participante?.admin === 'superadmin'
    const esOwnerBot = config.OWNERS.some((o) => o.numero === numeroRemitente)

    if (!esAdmin && !esOwnerBot) {
      return sock.sendMessage(jid, { text: '⛔ Solo los administradores del grupo pueden usar este comando.' }, { quoted: msg })
    }

    const mensajeExtra = args.join(' ').trim()
    const mentions = metadata.participants.map((p) => p.id)

    const texto = caja('📢', 'Mención general', [
      mensajeExtra ? `💬 ${mensajeExtra}` : null,
      ...metadata.participants.map((p) => `✦ @${p.id.split('@')[0]}`),
    ], metadata.subject)

    await sock.sendMessage(jid, { text: texto, mentions }, { quoted: msg })
  },
}