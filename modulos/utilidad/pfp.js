// COMANDO PROFILEPIC PARA YUIBOT-MD
module.exports = {
  name: 'profilepic',
  aliases: ['pfp', 'foto', 'avatar'],
  description: 'Obtiene la foto de perfil de un usuario (mencionado, número o el otro participante en privado)',
  category: 'util',

  async execute(sock, msg, args, { config }) {
    const remoteJid = msg.key.remoteJid
    const isGroup = remoteJid.endsWith('@g.us')

    let targetJid = null

    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid
    if (mentioned && mentioned.length > 0) {
      targetJid = mentioned[0]
    }

    if (!targetJid && args.length > 0) {
      let numero = args[0].replace(/[^0-9]/g, '')
      if (numero.length >= 10) {
        targetJid = numero + '@s.whatsapp.net'
      }
    }

    if (!targetJid && isGroup) {
      return sock.sendMessage(remoteJid, {
        text: '❌ Debes mencionar a un usuario o escribir su número.\nEjemplo: !pfp @usuario  o  !pfp 123456789'
      }, { quoted: msg })
    }

    if (!targetJid && !isGroup) {
      targetJid = remoteJid
    }

    if (!targetJid) {
      if (config.BOT_NUMBER) {
        targetJid = config.BOT_NUMBER + '@s.whatsapp.net'
      } else {
        return sock.sendMessage(remoteJid, { text: '❌ No se pudo determinar el usuario objetivo.' }, { quoted: msg })
      }
    }

    if (!targetJid.includes('@s.whatsapp.net') && !targetJid.includes('@g.us')) {
      if (!targetJid.includes('@')) {
        targetJid += '@s.whatsapp.net'
      }
    }

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

    try {
      const url = await sock.profilePictureUrl(targetJid, 'image')

      const respImg = await fetch(url)
      if (!respImg.ok) {
        if (respImg.status === 404) {
          return sock.sendMessage(remoteJid, {
            text: `❌ El usuario ${targetJid.split('@')[0]} no tiene foto de perfil.`
          }, { quoted: msg })
        }
        throw new Error(`HTTP ${respImg.status}`)
      }

      const buffer = Buffer.from(await respImg.arrayBuffer())

      await sock.sendMessage(remoteJid, {
        image: buffer,
        caption: `🖼️ *Foto de perfil de* ${targetJid.split('@')[0]}\n${isGroup ? `👥 Grupo: ${(await sock.groupMetadata(remoteJid)).subject}` : '💬 Chat privado'}`
      }, { quoted: msg })

    } catch (error) {
      console.error('[PROFILEPIC] Error al obtener foto:', error)
      return sock.sendMessage(remoteJid, {
        text: '❌ Ocurrió un error al obtener la foto de perfil.'
      }, { quoted: msg })
    }
  },
}