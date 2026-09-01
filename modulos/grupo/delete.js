module.exports = {
  name: 'delete',
  aliases: ['del', 'borrar', 'eliminar'],
  description: 'Elimina un mensaje del grupo',
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
      console.error('[DELETE] Error obteniendo metadata:', error)

      return sock.sendMessage(
        jid,
        { text: '❌ No se pudo obtener la información del grupo.' },
        { quoted: msg }
      )
    }

    const remitente =
      msg.key.participantAlt ||
      msg.key.participant ||
      jid

    const numeroRemitente = remitente
      .split('@')[0]
      .split(':')[0]

    const participante = metadata.participants.find(p => {
      const id = p.id?.split('@')[0]?.split(':')[0]
      const lid = p.lid?.split('@')[0]?.split(':')[0]
      const phone = p.phoneNumber?.split('@')[0]?.split(':')[0]

      return (
        id === numeroRemitente ||
        lid === numeroRemitente ||
        phone === numeroRemitente
      )
    })

    const esAdmin =
      participante?.admin === 'admin' ||
      participante?.admin === 'superadmin' ||
      participante?.isAdmin === true ||
      participante?.isSuperAdmin === true

    const owners = config?.OWNERS || []

    const esOwnerBot = owners.some(o => {
      const numeroOwner =
        typeof o === 'string'
          ? o.replace(/\D/g, '')
          : String(o?.numero || '').replace(/\D/g, '')

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
      id: contextInfo.stanzaId
    }

    if (contextInfo.participant) {
      deleteKey.participant = contextInfo.participant
    }

    if (contextInfo.participantAlt) {
      deleteKey.participantAlt = contextInfo.participantAlt
    }

    try {
      await sock.sendMessage(jid, {
        delete: deleteKey
      })
    } catch (error) {
      console.error('[DELETE] Error al eliminar:', error)

      const errorText = String(error?.message || error)

      if (
        errorText.includes('not-authorized') ||
        errorText.includes('not authorized') ||
        errorText.includes('forbidden') ||
        errorText.includes('401')
      ) {
        return sock.sendMessage(
          jid,
          {
            text: '⚠️ No puedo eliminar ese mensaje. Verifica que el bot sea administrador del grupo.'
          },
          { quoted: msg }
        )
      }

      if (
        errorText.includes('too-old') ||
        errorText.includes('expired')
      ) {
        return sock.sendMessage(
          jid,
          {
            text: '⏰ Ese mensaje es demasiado antiguo para eliminarlo.'
          },
          { quoted: msg }
        )
      }

      return sock.sendMessage(
        jid,
        {
          text: '❌ No se pudo eliminar el mensaje.'
        },
        { quoted: msg }
      )
    }
  }
}