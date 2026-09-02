//COMANDO KICK PARA YUIBOT-MD
module.exports = {
  name: 'kick',
  aliases: ['sacar', 'expulsar'],
  description: 'Elimina a un miembro del grupo (solo admins)',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid

    // Verificar que sea un grupo
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg })
    }

    // Verificar que se haya mencionado a alguien
    if (!msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length && args.length === 0) {
      return sock.sendMessage(jid, { 
        text: '❌ Debes mencionar al usuario que quieres eliminar.\nEjemplo: !kick @usuario' 
      }, { quoted: msg })
    }

    let metadata
    try {
      metadata = await sock.groupMetadata(jid)
    } catch (error) {
      console.error('[KICK]', error)
      return sock.sendMessage(jid, { text: '❌ No se pudo obtener la información del grupo.' }, { quoted: msg })
    }

    // Obtener información del remitente
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numeroRemitente = remitente.split('@')[0].split(':')[0]

    const participante = metadata.participants.find((p) => p.id.split('@')[0].split(':')[0] === numeroRemitente)
    const esAdmin = participante?.admin === 'admin' || participante?.admin === 'superadmin'
    const esOwnerBot = config.OWNERS.some((o) => o.numero === numeroRemitente)

    // Verificar permisos
    if (!esAdmin && !esOwnerBot) {
      return sock.sendMessage(jid, { text: '⛔ Solo los administradores del grupo pueden usar este comando.' }, { quoted: msg })
    }

    // Obtener los usuarios a eliminar (menciones)
    let usersToKick = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    
    // Si no hay menciones pero hay argumentos, intentar obtener por número
    if (usersToKick.length === 0 && args.length > 0) {
      const numero = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
      const existe = metadata.participants.some(p => p.id === numero)
      if (existe) {
        usersToKick.push(numero)
      } else {
        return sock.sendMessage(jid, { 
          text: '❌ No se encontró al usuario especificado en el grupo.' 
        }, { quoted: msg })
      }
    }

    // Verificar que no se intente eliminar al propio admin
    const adminIds = metadata.participants
      .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
      .map(p => p.id)

    const selfId = remitente
    const kickableUsers = usersToKick.filter(user => {
      // No permitir eliminar al propio usuario
      if (user === selfId) {
        sock.sendMessage(jid, { 
          text: `❌ No puedes eliminarte a ti mismo.` 
        }, { quoted: msg })
        return false
      }
      // No permitir eliminar a otros administradores
      if (adminIds.includes(user)) {
        sock.sendMessage(jid, { 
          text: `❌ No puedes eliminar a otro administrador del grupo.` 
        }, { quoted: msg })
        return false
      }
      return true
    })

    if (kickableUsers.length === 0) {
      return
    }

    // Eliminar usuarios
    let kicked = 0
    let failed = 0

    for (const user of kickableUsers) {
      try {
        await sock.groupParticipantsUpdate(jid, [user], 'remove')
        kicked++
      } catch (error) {
        console.error('[KICK] Error al eliminar:', error)
        failed++
      }
    }

    // Enviar mensaje de confirmación
    let mensaje = `⛧───「 Usuarios Eliminados 」───⛧\n\n`
    if (kicked > 0) {
      mensaje += `✅ ${kicked} usuario${kicked > 1 ? 's' : ''} eliminado${kicked > 1 ? 's' : ''} correctamente.\n\n`
    }
    if (failed > 0) {
      mensaje += `❌ ${failed} usuario${failed > 1 ? 's' : ''} no pudieron ser eliminados.\n`
    }
    mensaje += `\n╰─➤ _${metadata.subject}_ 🥀`

    await sock.sendMessage(jid, { text: mensaje }, { quoted: msg })
  },
}