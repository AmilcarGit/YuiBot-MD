// COMANDO DELETE PARA YUIBOT-MD (versión corregida)
module.exports = {
  name: 'delete',
  aliases: ['del', 'borrar', 'eliminar'],
  description: 'Elimina un mensaje del grupo para todos (solo admins). Responde al mensaje que quieras borrar.',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid

    // Verificar que sea un grupo
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg })
    }

    // Verificar que el mensaje sea una respuesta
    if (!msg.message?.extendedTextMessage?.contextInfo?.stanzaId) {
      return sock.sendMessage(jid, {
        text: '❌ Debes responder al mensaje que deseas eliminar.\nEjemplo: !delete (respondiendo al mensaje)'
      }, { quoted: msg })
    }

    let metadata
    try {
      metadata = await sock.groupMetadata(jid)
    } catch (error) {
      console.error('[DELETE]', error)
      return sock.sendMessage(jid, { text: '❌ No se pudo obtener la información del grupo.' }, { quoted: msg })
    }

    // Obtener información del remitente (quien ejecuta el comando)
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numeroRemitente = remitente.split('@')[0].split(':')[0]

    const participante = metadata.participants.find((p) => p.id.split('@')[0].split(':')[0] === numeroRemitente)
    const esAdmin = participante?.admin === 'admin' || participante?.admin === 'superadmin'
    const esOwnerBot = config.OWNERS.some((o) => o.numero === numeroRemitente)

    // Verificar permisos del usuario que ejecuta
    if (!esAdmin && !esOwnerBot) {
      return sock.sendMessage(jid, { text: '⛔ Solo los administradores del grupo pueden eliminar mensajes.' }, { quoted: msg })
    }

    // Obtener datos del mensaje a eliminar
    const contextInfo = msg.message.extendedTextMessage.contextInfo
    const targetId = contextInfo.stanzaId
    const targetParticipant = contextInfo.participant // JID del autor del mensaje original

    if (!targetParticipant) {
      return sock.sendMessage(jid, {
        text: '❌ No se pudo identificar al autor del mensaje. Asegúrate de responder al mensaje correctamente.'
      }, { quoted: msg })
    }

    // Verificar si el bot es administrador (necesario solo si el mensaje no es del bot)
    const botJid = sock.user.id.split(':')[0] + '@s.whatsapp.net'
    const botEsAdmin = metadata.participants.some(p => p.id === botJid && (p.admin === 'admin' || p.admin === 'superadmin'))

    if (targetParticipant !== botJid && !botEsAdmin) {
      return sock.sendMessage(jid, {
        text: '⚠️ El bot necesita ser administrador para eliminar mensajes de otros usuarios.'
      }, { quoted: msg })
    }

    // Preparar el objeto de eliminación
    const deleteMessage = {
      remoteJid: jid,
      fromMe: targetParticipant === botJid, // true si es mensaje del bot
      id: targetId,
      participant: targetParticipant // obligatorio para mensajes de otros
    }

    try {
      await sock.sendMessage(jid, { delete: deleteMessage })

      // Enviar confirmación (opcional, pero siguiendo el estilo del comando promote)
      await sock.sendMessage(jid, {
        text: `✅ Mensaje eliminado por @${numeroRemitente}`,
        mentions: [remitente]
      }, { quoted: msg })

    } catch (error) {
      console.error('[DELETE] Error al eliminar:', error)
      await sock.sendMessage(jid, {
        text: '❌ No se pudo eliminar el mensaje. Puede que ya haya sido eliminado o que no tengas permisos suficientes.'
      }, { quoted: msg })
    }
  }
}