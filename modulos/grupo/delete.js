module.exports = {
  name: 'delete',
  aliases: ['del', 'borrar', 'eliminar'],
  description: 'Elimina un mensaje del grupo (solo admins, el bot debe ser admin)',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid

    // Solo en grupos
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg })
    }

    // Obtener metadata del grupo
    let metadata
    try {
      metadata = await sock.groupMetadata(jid)
    } catch (error) {
      console.error('[DELETE] Error al obtener metadata:', error)
      return sock.sendMessage(jid, { text: '❌ No se pudo obtener la información del grupo.' }, { quoted: msg })
    }

    // Verificar que el usuario que ejecuta el comando sea admin o owner
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numeroRemitente = remitente.split('@')[0].split(':')[0]

    const participante = metadata.participants.find((p) => p.id.split('@')[0].split(':')[0] === numeroRemitente)
    const esAdmin = participante?.admin === 'admin' || participante?.admin === 'superadmin'
    const esOwnerBot = config.OWNERS.some((o) => o.numero === numeroRemitente)

    if (!esAdmin && !esOwnerBot) {
      return sock.sendMessage(jid, { text: '⛔ Solo los administradores del grupo pueden usar este comando.' }, { quoted: msg })
    }

    // Verificar que el bot sea administrador del grupo
    const botId = sock.user.id.split(':')[0] + '@s.whatsapp.net' // Normalizar ID
    const botParticipante = metadata.participants.find((p) => p.id === botId)
    const botEsAdmin = botParticipante?.admin === 'admin' || botParticipante?.admin === 'superadmin'

    if (!botEsAdmin) {
      return sock.sendMessage(jid, { 
        text: '⚠️ El bot no es administrador del grupo. No puede eliminar mensajes de otros usuarios.' 
      }, { quoted: msg })
    }

    // Obtener el mensaje citado (al que se respondió)
    const contextInfo = msg.message?.extendedTextMessage?.contextInfo
    if (!contextInfo || !contextInfo.stanzaId) {
      return sock.sendMessage(jid, { 
        text: '❌ Debes responder al mensaje que deseas eliminar.\nEjemplo: !del (respondiendo al mensaje)' 
      }, { quoted: msg })
    }

    // Construir la clave del mensaje a eliminar
    const deleteKey = {
      id: contextInfo.stanzaId,
      remoteJid: jid,
      fromMe: false,
      participant: contextInfo.participant || jid // El remitente del mensaje citado
    }

    // Intentar eliminar
    try {
      await sock.sendMessage(jid, { delete: deleteKey })
      
      // Enviar confirmación (opcional, puede ser que el mensaje desaparezca rápido)
      await sock.sendMessage(jid, { 
        text: `✅ Mensaje eliminado correctamente.`,
        // No mencionamos a nadie para no generar notificaciones adicionales
      }, { quoted: msg })
    } catch (error) {
      console.error('[DELETE] Error al eliminar:', error)
      // Si falla, puede ser por falta de permisos o mensaje muy antiguo
      let errorMsg = '❌ No se pudo eliminar el mensaje. '
      if (error.message && error.message.includes('not-authorized')) {
        errorMsg += 'Verifica que el bot tenga permisos de administrador.'
      } else if (error.message && error.message.includes('too-old')) {
        errorMsg += 'El mensaje es demasiado antiguo para ser eliminado (más de 48 horas).'
      } else {
        errorMsg += 'Intenta nuevamente.'
      }
      return sock.sendMessage(jid, { text: errorMsg }, { quoted: msg })
    }
  },
}