// COMANDO PROFILEPIC PARA YUIBOT-MD
const axios = require('axios') // Asegúrate de tener axios instalado

module.exports = {
  name: 'profilepic',
  aliases: ['pfp', 'foto', 'avatar', 'perfil'],
  description: 'Obtiene la foto de perfil de un usuario (mencionado, número o el otro participante en privado)',
  category: 'util',

  async execute(sock, msg, args, { config }) {
    const remoteJid = msg.key.remoteJid
    const isGroup = remoteJid.endsWith('@g.us')

    // Determinar el JID objetivo
    let targetJid = null

    // 1. Si hay menciones, usar la primera
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (mentioned && mentioned.length > 0) {
      targetJid = mentioned[0]
    }

    // 2. Si no hay menciones pero hay argumentos (número)
    if (!targetJid && args.length > 0) {
      let numero = args[0].replace(/[^0-9]/g, '')
      if (numero.length >= 10) {
        // Si es un número corto, asumir código de país? Mejor mantenerlo simple.
        targetJid = numero + '@s.whatsapp.net'
      }
    }

    // 3. Si sigue sin target y es grupo, no se puede inferir automáticamente -> error
    if (!targetJid && isGroup) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Debes mencionar a un usuario o escribir su número.\nEjemplo: !pfp @usuario  o  !pfp 123456789'
      }, { quoted: msg })
    }

    // 4. Si es privado y no hay target, tomar al otro participante
    if (!targetJid && !isGroup) {
      // En chat privado, remoteJid es el JID del otro usuario
      targetJid = remoteJid
    }

    // 5. Si aún no hay target, usar el propio bot (opcional, podríamos devolver error)
    if (!targetJid) {
      // Podríamos usar el número del bot desde config
      if (config.BOT_NUMBER) {
        targetJid = config.BOT_NUMBER + '@s.whatsapp.net'
      } else {
        return sock.sendMessage(remoteJid, { text: '❌ No se pudo determinar el usuario objetivo.' }, { quoted: msg })
      }
    }

    // Verificar si el target es válido (tiene @s.whatsapp.net o @g.us? Pero solo queremos usuario)
    if (!targetJid.includes('@s.whatsapp.net') && !targetJid.includes('@g.us')) {
      // Si no, agregar el dominio por defecto
      if (!targetJid.includes('@')) {
        targetJid += '@s.whatsapp.net'
      }
    }

    // Si es grupo, verificar que el usuario esté en el grupo
    if (isGroup) {
      try {
        const metadata = await sock.groupMetadata(remoteJid)
        const exists = metadata.participants.some(p => p.id === targetJid)
        if (!exists) {
          return sock.sendMessage(remoteJid, {
            text: `❌ El usuario ${targetJid.split('@')[0]} no está en este grupo.`
          }, { quoted: msg })
        }
      } catch (error) {
        console.error('[PROFILEPIC] Error al obtener metadata:', error)
        return sock.sendMessage(remoteJid, { text: '❌ No se pudo verificar la pertenencia al grupo.' }, { quoted: msg })
      }
    }

    // Obtener la foto de perfil
    try {
      const url = await sock.profilePictureUrl(targetJid, 'image')
      // Descargar la imagen
      const response = await axios.get(url, { responseType: 'arraybuffer' })
      const buffer = Buffer.from(response.data, 'binary')

      // Enviar la imagen
      await sock.sendMessage(remoteJid, {
        image: buffer,
        caption: `🖼️ *Foto de perfil de* ${targetJid.split('@')[0]}\n${isGroup ? `👥 Grupo: ${(await sock.groupMetadata(remoteJid)).subject}` : '💬 Chat privado'}`
      }, { quoted: msg })

    } catch (error) {
      if (error.response && error.response.status === 404) {
        return sock.sendMessage(remoteJid, {
          text: `❌ El usuario ${targetJid.split('@')[0]} no tiene foto de perfil.`
        }, { quoted: msg })
      }
      console.error('[PROFILEPIC] Error al obtener foto:', error)
      return sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al obtener la foto de perfil.'
      }, { quoted: msg })
    }
  },
}