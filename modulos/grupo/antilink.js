// ANTI-LINK PARA YUIBOT-MD

const WHATSAPP_LINK_REGEX = /(?:https?:\/\/)?(?:chat\.whatsapp\.com\/(?:invite\/)?[0-9A-Za-z]{16,}|(?:www\.)?whatsapp\.com\/channel\/[0-9A-Za-z]{16,})/i
const WHATSAPP_TEXT_REGEX = /whatsapp/i

// Función para obtener todos los textos posibles de un mensaje
function getAllCandidateStrings(m) {
  const candidates = []
  
  // Texto directo
  if (m.text) candidates.push(m.text)
  if (m.body) candidates.push(m.body)
  if (m.caption) candidates.push(m.caption)
  
  // Mensaje de WhatsApp
  if (m.message) {
    if (m.message.conversation) candidates.push(m.message.conversation)
    if (m.message.extendedTextMessage) {
      if (m.message.extendedTextMessage.text) candidates.push(m.message.extendedTextMessage.text)
      if (m.message.extendedTextMessage.matchedText) candidates.push(m.message.extendedTextMessage.matchedText)
      if (m.message.extendedTextMessage.canonicalUrl) candidates.push(m.message.extendedTextMessage.canonicalUrl)
    }
    if (m.message.imageMessage?.caption) candidates.push(m.message.imageMessage.caption)
    if (m.message.videoMessage?.caption) candidates.push(m.message.videoMessage.caption)
    if (m.message.documentMessage?.caption) candidates.push(m.message.documentMessage.caption)
  }
  
  return candidates.filter(text => typeof text === 'string' && text.length > 0)
}

// Función para buscar enlaces de WhatsApp
function findWhatsAppLink(m) {
  const texts = getAllCandidateStrings(m)
  for (const text of texts) {
    if (WHATSAPP_LINK_REGEX.test(text)) {
      return text
    }
  }
  return ''
}

// Función para verificar si hay texto relacionado con WhatsApp
function hasWhatsAppText(m) {
  const texts = getAllCandidateStrings(m)
  return texts.some(text => WHATSAPP_TEXT_REGEX.test(text))
}

// Función para obtener el ID del grupo desde el mensaje
function getGroupId(m) {
  return m.key?.remoteJid || m.chat || m.from
}

// Función para obtener el ID del remitente
function getSenderId(m) {
  return m.key?.participant || m.key?.remoteJid || m.sender || m.from
}

// Función para decodificar JID (si está disponible)
function decodeJid(jid) {
  if (!jid) return null
  if (typeof jid === 'string') {
    return jid.split(':')[0].split('@')[0]
  }
  return jid
}

// Función principal del plugin
module.exports = {
  name: 'antilink',
  aliases: ['nolink', 'antienlace'],
  category: 'moderación',
  description: 'Sistema anti-enlaces de WhatsApp',
  tag: 'group',

  // Función que se ejecuta antes de procesar el mensaje
  async before(m, { conn, isAdmin, isBotAdmin, isOwner, isROwner }) {
    try {
      // Verificar si es un mensaje de grupo
      const groupId = getGroupId(m)
      if (!groupId || !groupId.endsWith('@g.us')) {
        return true
      }

      // Verificar si el bot es responsable
      if (!isBotAdmin) {
        return true
      }

      // Obtener configuración del chat desde la base de datos global
      const chatConfig = global.db?.data?.chats?.[groupId] || {}
      
      // Verificar si el anti-link está activado
      if (!chatConfig.antiLink) {
        return true
      }

      // Excepciones para admins, owners y el propio bot
      const senderId = getSenderId(m)
      const botId = conn.user?.id || conn.user?.jid || ''
      const decodedBotId = decodeJid(botId)
      const decodedSender = decodeJid(senderId)

      if (isAdmin || isOwner || isROwner || m.fromMe || 
          decodedSender === decodedBotId) {
        return true
      }

      // Buscar enlaces de WhatsApp
      const detectedLink = findWhatsAppLink(m)
      if (!detectedLink) {
        return true
      }

      // Verificar si es el enlace de invitación del propio grupo
      try {
        const inviteCode = await conn.groupInviteCode(groupId).catch(() => null)
        if (inviteCode && detectedLink.includes(`chat.whatsapp.com/${inviteCode}`)) {
          return true
        }
      } catch (error) {
        // Si falla obtener el código, continuar con la acción
        console.warn('[ANTILINK] No se pudo obtener código de invitación:', error.message)
      }

      // Eliminar el mensaje con enlace
      try {
        await conn.sendMessage(groupId, { delete: m.key })
      } catch (error) {
        console.error('[ANTILINK] Error al eliminar mensaje:', error)
      }

      // Preparar mensaje de advertencia
      const senderName = m.pushName || senderId.split('@')[0] || 'Usuario'
      const senderTag = senderId.split('@')[0] || senderId

      // Enviar advertencia
      await conn.sendMessage(
        groupId,
        {
          text: `*「 ENLACE DETECTADO 」*\n\n✦ @${senderTag} Rompiste las reglas del Grupo.\n✦ Serás eliminado...`,
          mentions: [senderId]
        },
        { quoted: m }
      )

      // Expulsar al infractor
      try {
        await conn.groupParticipantsUpdate(groupId, [senderId], 'remove')
        console.log(`[ANTILINK] Usuario ${senderTag} expulsado del grupo ${groupId}`)
      } catch (error) {
        console.error('[ANTILINK] Error al expulsar infractor:', error)
        await conn.sendMessage(
          groupId,
          {
            text: '❌ No pude expulsar al usuario.\n✦ Verifica mis permisos de administrador.'
          },
          { quoted: m }
        )
      }

      // Marcar como manejado para evitar conflictos
      m.__pluginHalt = true
      return true

    } catch (error) {
      console.error('[ANTILINK] Error general:', error)
      return true
    }
  },

  // Comando para activar/desactivar anti-link
  async execute(sock, msg, args, { isAdmin, isOwner, isBotAdmin }) {
    try {
      const jid = msg.key?.remoteJid || msg.chat

      // Verificar si es grupo
      if (!jid || !jid.endsWith('@g.us')) {
        return sock.sendMessage(jid, {
          text: '❌ Este comando solo funciona en grupos.'
        }, { quoted: msg })
      }

      // Verificar permisos
      if (!isAdmin && !isOwner) {
        return sock.sendMessage(jid, {
          text: '❌ Solo administradores pueden configurar el anti-link.'
        }, { quoted: msg })
      }

      // Verificar si el bot es admin
      if (!isBotAdmin) {
        return sock.sendMessage(jid, {
          text: '❌ Necesito ser administrador para usar el anti-link.'
        }, { quoted: msg })
      }

      // Inicializar base de datos si no existe
      if (!global.db) {
        global.db = { data: { chats: {} } }
      }
      if (!global.db.data) {
        global.db.data = { chats: {} }
      }
      if (!global.db.data.chats) {
        global.db.data.chats = {}
      }
      if (!global.db.data.chats[jid]) {
        global.db.data.chats[jid] = {}
      }

      // Obtener estado actual
      const currentState = global.db.data.chats[jid].antiLink || false

      // Si no hay argumentos, mostrar estado
      if (!args || args.length === 0) {
        return sock.sendMessage(jid, {
          text: `📌 *Estado del Anti-Link*\n\n` +
                `✦ Estado: ${currentState ? '✅ Activado' : '❌ Desactivado'}\n\n` +
                `📝 Comandos:\n` +
                `▸ .antilink on - Activar\n` +
                `▸ .antilink off - Desactivar\n\n` +
                `✦ Detecta enlaces de WhatsApp y Channels\n` +
                `✦ Elimina mensajes y expulsa infractores`
        }, { quoted: msg })
      }

      // Procesar comandos
      const action = args[0].toLowerCase()

      if (action === 'on' || action === 'activar' || action === 'enable') {
        global.db.data.chats[jid].antiLink = true

        // Guardar configuración si existe método write
        if (global.db.write) {
          try {
            await global.db.write()
          } catch (error) {
            console.warn('[ANTILINK] No se pudo guardar configuración:', error)
          }
        }

        await sock.sendMessage(jid, {
          text: '✅ *Anti-Link Activado*\n\n' +
                '✦ Los enlaces de WhatsApp serán bloqueados.\n' +
                '✦ Los infractores serán expulsados.\n' +
                '✦ Admins y owners están exentos.'
        }, { quoted: msg })

      } else if (action === 'off' || action === 'desactivar' || action === 'disable') {
        global.db.data.chats[jid].antiLink = false

        // Guardar configuración si existe método write
        if (global.db.write) {
          try {
            await global.db.write()
          } catch (error) {
            console.warn('[ANTILINK] No se pudo guardar configuración:', error)
          }
        }

        await sock.sendMessage(jid, {
          text: '❌ *Anti-Link Desactivado*\n\n' +
                '✦ Los enlaces de WhatsApp ya no serán bloqueados.'
        }, { quoted: msg })

      } else {
        await sock.sendMessage(jid, {
          text: '❌ Comando inválido.\n\n' +
                '✦ Usa: .antilink on/off\n' +
                `✦ Ejemplo: .antilink ${currentState ? 'off' : 'on'}`
        }, { quoted: msg })
      }

    } catch (error) {
      console.error('[ANTILINK-CMD] Error:', error)
      const jid = msg.key?.remoteJid || msg.chat
      await sock.sendMessage(jid, {
        text: `❌ Error al ejecutar comando.\n\n✦ ${error.message || 'Error desconocido'}`
      }, { quoted: msg })
    }
  },

  // Configuración del plugin
  options: {
    requiresGroup: true,
    requiresAdmin: true,
    requiresBotAdmin: true,
    cooldown: 5
  }
}