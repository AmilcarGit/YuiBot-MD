//COMANDO DEMOTE PARA YUIBOT-MD
module.exports = {
  name: 'demote',
  aliases: ['quitaradmin', 'sacaradmin', 'degradar'],
  description: 'Quita el rango de administrador a un miembro del grupo (solo admins)',
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
        text: '❌ Debes mencionar al usuario al que quieres quitarle el admin.\nEjemplo: !demote @usuario' 
      }, { quoted: msg })
    }

    let metadata
    try {
      metadata = await sock.groupMetadata(jid)
    } catch (error) {
      console.error('[DEMOTE]', error)
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

    // Obtener los usuarios a degradar (menciones)
    let usersToDemote = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    
    // Si no hay menciones pero hay argumentos, intentar obtener por número
    if (usersToDemote.length === 0 && args.length > 0) {
      const numero = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
      const existe = metadata.participants.some(p => p.id === numero)
      if (existe) {
        usersToDemote.push(numero)
      } else {
        return sock.sendMessage(jid, { 
          text: '❌ No se encontró al usuario especificado en el grupo.' 
        }, { quoted: msg })
      }
    }

    // Verificar que los usuarios sean administradores
    const adminUsers = metadata.participants
      .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
      .map(p => p.id)

    const selfId = remitente
    const demotableUsers = usersToDemote.filter(user => {
      // Verificar si el usuario es administrador
      if (!adminUsers.includes(user)) {
        sock.sendMessage(jid, { 
          text: `❌ @${user.split('@')[0]} no es administrador del grupo.` 
        }, { quoted: msg, mentions: [user] })
        return false
      }
      // No permitir degradarse a sí mismo
      if (user === selfId) {
        sock.sendMessage(jid, { 
          text: `❌ No puedes quitarte el admin a ti mismo.` 
        }, { quoted: msg })
        return false
      }
      // No permitir degradar a otros admins si no eres superadmin (opcional)
      const targetParticipant = metadata.participants.find(p => p.id === user)
      if (targetParticipant?.admin === 'superadmin' && participante?.admin !== 'superadmin') {
        sock.sendMessage(jid, { 
          text: `❌ Solo un superadmin puede degradar a otro superadmin.` 
        }, { quoted: msg })
        return false
      }
      return true
    })

    if (demotableUsers.length === 0) {
      return
    }

    // Degradar usuarios
    let demoted = 0
    let failed = 0

    for (const user of demotableUsers) {
      try {
        await sock.groupParticipantsUpdate(jid, [user], 'demote')
        demoted++
      } catch (error) {
        console.error('[DEMOTE] Error al degradar:', error)
        failed++
      }
    }

    // Enviar mensaje de confirmación
    let mensaje = `⛧───「 Admins Degradados 」───⛧\n\n`
    if (demoted > 0) {
      mensaje += `✅ ${demoted} usuario${demoted > 1 ? 's' : ''} degradado${demoted > 1 ? 's' : ''} correctamente.\n\n`
      // Mostrar nombres de los degradados
      const demotedNames = demotableUsers.map(user => `@${user.split('@')[0]}`).join(', ')
      mensaje += `👤 Usuarios: ${demotedNames}\n\n`
    }
    if (failed > 0) {
      mensaje += `❌ ${failed} usuario${failed > 1 ? 's' : ''} no pudieron ser degradados.\n`
    }
    mensaje += `\n╰─➤ _${metadata.subject}_ 🥀`

    await sock.sendMessage(jid, { 
      text: mensaje,
      mentions: demotableUsers
    }, { quoted: msg })
  },
}