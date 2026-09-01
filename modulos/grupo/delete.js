module.exports = {
  name: 'delete',
  aliases: ['del', 'borrar', 'eliminar'],
  description: 'Elimina un mensaje del grupo (solo admins, el bot debe ser admin)',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid

    if (!jid || !jid.endsWith('@g.us')) {
      return sock.sendMessage(
        jid,
        { text: '❌ Este comando solo funciona en grupos.' },
        { quoted: msg }
      )
    }

    let metadata

    try {
      metadata = await sock.groupMetadata(jid)
    } catch (error) {
      console.error('[DELETE] Error metadata:', error)

      return sock.sendMessage(
        jid,
        { text: '❌ No se pudo obtener la información del grupo.' },
        { quoted: msg }
      )
    }

    const remitente =
      msg.key.participantAlt ||
      msg.key.participant ||
      msg.key.remoteJid

    const numeroRemitente = remitente
      .split('@')[0]
      .split(':')[0]

    const participante = metadata.participants.find(p => {
      const idNumero = p.id?.split('@')[0]?.split(':')[0]
      const lidNumero = p.lid?.split('@')[0]?.split(':')[0]

      return (
        idNumero === numeroRemitente ||
        lidNumero === numeroRemitente
      )
    })

    const esAdmin =
      participante?.admin === 'admin' ||
      participante?.admin === 'superadmin'

    const owners = config?.OWNERS || []

    const esOwnerBot = owners.some(o => {
      const numeroOwner =
        typeof o === 'string'
          ? o.replace(/\D/g, '')
          : String(o.numero || '').replace(/\D/g, '')

      return numeroOwner === numeroRemitente
    })

    if (!esAdmin && !esOwnerBot) {
      return sock.sendMessage(
        jid,
        {
          text: '⛔ Solo los administradores del grupo pueden usar este comando.'
        },
        { quoted: msg }
      )
    }

    const botJid = sock.user?.id
      ? sock.user.id.split(':')[0] + '@s.whatsapp.net'
      : null

    const botLid =
      sock.user?.lid ||
      sock.user?.lidJid ||
      null

    const botParticipante = metadata.participants.find(p => {
      return (
        p.id === botJid ||
        p.id === sock.user?.id ||
        (botLid && p.id === botLid) ||
        (botLid && p.lid === botLid)
      )
    })

    const botEsAdmin =
      botParticipante?.admin === 'admin' ||
      botParticipante?.admin === 'superadmin'

    if (!botParticipante) {
      return sock.sendMessage(
        jid,
        {
          text: '⚠️ No pude identificar al bot dentro de los participantes del grupo.'
        },
        { quoted: msg }
      )
    }

    if (!botEsAdmin) {
      return sock.sendMessage(
        jid,
        {
          text: '⚠️ El bot está en el grupo, pero no es administrador.\n\nHaz administrador al bot e inténtalo nuevamente.'
        },
        { quoted: msg }
      )
    }

    const contextInfo =
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo ||
      msg.message?.videoMessage?.contextInfo ||
      msg.message?.documentMessage?.contextInfo

    if (!contextInfo?.stanzaId) {
      return sock.sendMessage(
        jid,
        {
          text: '❌ Debes responder al mensaje que deseas eliminar.\n\nEjemplo:\n↩️ Responde al mensaje y escribe *.del*'
        },
        { quoted: msg }
      )
    }

    const deleteKey = {
      remoteJid: jid,
      fromMe: false,
      id: contextInfo.stanzaId,
      participant:
        contextInfo.participant ||
        contextInfo.participantAlt ||
        jid
    }

    try {
      await sock.sendMessage(jid, {
        delete: deleteKey
      })

    } catch (error) {
      console.error('[DELETE] Error al eliminar:', error)

      const errorText = String(error?.message || error)

      let texto = '❌ No se pudo eliminar el mensaje.'

      if (
        errorText.includes('not-authorized') ||
        errorText.includes('not authorized')
      ) {
        texto += '\n⚠️ El bot no tiene permisos suficientes.'
      } else if (
        errorText.includes('too-old') ||
        errorText.includes('expired')
      ) {
        texto += '\n⏰ El mensaje puede ser demasiado antiguo para eliminarlo.'
      } else {
        texto += '\n🔄 Intenta nuevamente.'
      }

      return sock.sendMessage(
        jid,
        { text: texto },
        { quoted: msg }
      )
    }
  }
}