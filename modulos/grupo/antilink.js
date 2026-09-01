// ANTI-LINK PARA YUIBOT-MD - VERSIÓN MEJORADA CON VERIFICACIÓN DE ADMINS

const WHATSAPP_LINK_REGEX = /(?:https?:\/\/)?(?:chat\.whatsapp\.com\/(?:invite\/)?[0-9A-Za-z]{16,}|(?:www\.)?whatsapp\.com\/channel\/[0-9A-Za-z]{16,})/i
const WHATSAPP_TEXT_REGEX = /whatsapp/i

// Función para obtener todos los textos posibles de un mensaje
function getAllCandidateStrings(m) {
  const candidates = []
  
  if (m.text) candidates.push(m.text)
  if (m.body) candidates.push(m.body)
  if (m.caption) candidates.push(m.caption)
  
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

// Función para obtener el ID del grupo
function getGroupId(m) {
  return m.key?.remoteJid || m.chat || m.from
}

// Función para obtener el ID del remitente
function getSenderId(m) {
  return m.key?.participant || m.key?.remoteJid || m.sender || m.from
}

// Función para decodificar JID
function decodeJid(jid) {
  if (!jid) return null
  if (typeof jid === 'string') {
    return jid.split(':')[0].split('@')[0]
  }
  return jid
}

// Función para verificar si un usuario es admin del grupo
async function isUserAdmin(sock, groupId, userId) {
  try {
    const metadata = await sock.groupMetadata(groupId)
    const participant = metadata.participants.find(p => p.id === userId)
    return participant?.admin === 'admin' || participant?.admin === 'superadmin'
  } catch (error) {
    console.error('[ANTILINK] Error al verificar admin:', error)
    return false
  }
}

// Función para inicializar DB
function initDb() {
  if (!global.db) {
    global.db = { 
      data: { chats: {} },
      write: async () => {}
    }
  }
  if (!global.db.data) {
    global.db.data = { chats: {} }
  }
  if (!global.db.data.chats) {
    global.db.data.chats = {}
  }
}

module.exports = {
  name: 'antilink',
  aliases: ['nolink', 'antienlace'],
  category: 'moderación',
  description: 'Sistema anti-enlaces de WhatsApp',
  tag: 'group',

  async before(m, { conn, isBotAdmin }) {
    try {
      // Obtener ID del grupo
      const groupId = getGroupId(m)
      if (!groupId || !groupId.endsWith('@g.us')) {
        return true
      }

      // Verificar si el bot es admin
      if (!isBotAdmin) {
        return true
      }

      // Inicializar DB
      initDb()

      // Obtener configuración del chat
      const chatConfig = global.db.data.chats[groupId] || {}
      
      // Verificar si el anti-link está activado
      if (!chatConfig.antiLink) {
        return true
      }

      // Obtener ID del remitente
      const senderId = getSenderId(m)
      if (!senderId) return true

      // OBTENER METADATA DEL GRUPO PARA VERIFICAR ADMINS
      let metadata
      try {
        metadata = await conn.groupMetadata(groupId)
      } catch (error) {
        console.error('[ANTILINK] Error al obtener metadata:', error)
        return true
      }

      // Verificar si el remitente es admin (USANDO LA MISMA LÓGICA QUE PROMOTE)
      const remitente = m.key?.participantAlt || m.key?.participant || groupId
      const numeroRemitente = remitente.split('@')[0].split(':')[0]
      
      const participante = metadata.participants.find((p) => p.id.split('@')[0].split(':')[0] === numeroRemitente)
      const esAdmin = participante?.admin === 'admin' || participante?.admin === 'superadmin'
      
      // También verificar si es owner del bot
      const esOwner = global.owner ? 
        (Array.isArray(global.owner) ? 
          global.owner.some(o => o === numeroRemitente || o === senderId) : 
          global.owner === numeroRemitente || global.owner === senderId) : 
        false

      // Obtener ID del bot
      const botId = conn.user?.id || conn.user?.jid || ''
      const decodedBotId = decodeJid(botId)
      const decodedSender = decodeJid(senderId)

      // EXCEPCIONES: Admins, Owners y el propio bot
      if (esAdmin || esOwner || m.fromMe || decodedSender === decodedBotId) {
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
        console.warn('[ANTILINK] No se pudo obtener código de invitación:', error.message)
      }

      // Preparar datos del infractor
      const senderName = m.pushName || senderId.split('@')[0] || 'Usuario'
      const senderTag = senderId.split('@')[0] || senderId

      // Eliminar el mensaje con enlace
      try {
        await conn.sendMessage(groupId, { delete: m.key })
        console.log(`[ANTILINK] Mensaje eliminado de ${senderTag}`)
      } catch (error) {
        console.error('[ANTILINK] Error al eliminar mensaje:', error)
      }

      // Enviar advertencia
      try {
        await conn.sendMessage(
          groupId,
          {
            text: `*「 ENLACE DETECTADO 」*\n\n✦ @${senderTag} Rompiste las reglas del Grupo.\n✦ Serás eliminado...`,
            mentions: [senderId]
          },
          { quoted: m }
        )
      } catch (error) {
        console.warn('[ANTILINK] Error al enviar advertencia:', error)
      }

      // Expulsar al infractor (con delay)
      setTimeout(async () => {
        try {
          await conn.groupParticipantsUpdate(groupId, [senderId], 'remove')
          console.log(`[ANTILINK] Usuario ${senderTag} expulsado del grupo ${groupId}`)
        } catch (error) {
          console.error('[ANTILINK] Error al expulsar infractor:', error)
          try {
            await conn.sendMessage(
              groupId,
              {
                text: `❌ No pude expulsar a @${senderTag}.\n✦ Verifica mis permisos de administrador.`,
                mentions: [senderId]
              },
              { quoted: m }
            )
          } catch (e) {
            console.error('[ANTILINK] Error al enviar mensaje de error:', e)
          }
        }
      }, 1500)

      return true

    } catch (error) {
      console.error('[ANTILINK] Error general:', error)
      return true
    }
  },

  // Comando para activar/desactivar anti-link
  async execute(sock, msg, args, { isBotAdmin }) {
    try {
      const jid = msg.key?.remoteJid || msg.chat

      // Verificar si es grupo
      if (!jid || !jid.endsWith('@g.us')) {
        await sock.sendMessage(jid, {
          text: '❌ Este comando solo funciona en grupos.'
        }, { quoted: msg })
        return
      }

      // Obtener metadata para verificar admins
      let metadata
      try {
        metadata = await sock.groupMetadata(jid)
      } catch (error) {
        console.error('[ANTILINK-CMD] Error al obtener metadata:', error)
        await sock.sendMessage(jid, {
          text: '❌ No se pudo obtener la información del grupo.'
        }, { quoted: msg })
        return
      }

      // Verificar si el usuario es admin (USANDO LA MISMA LÓGICA QUE PROMOTE)
      const remitente = msg.key?.participantAlt || msg.key?.participant || jid
      const numeroRemitente = remitente.split('@')[0].split(':')[0]
      
      const participante = metadata.participants.find((p) => p.id.split('@')[0].split(':')[0] === numeroRemitente)
      const esAdmin = participante?.admin === 'admin' || participante?.admin === 'superadmin'
      
      // Verificar si es owner del bot
      const esOwner = global.owner ? 
        (Array.isArray(global.owner) ? 
          global.owner.some(o => o === numeroRemitente || o === remitente) : 
          global.owner === numeroRemitente || global.owner === remitente) : 
        false

      // Verificar permisos (igual que en promote)
      if (!esAdmin && !esOwner) {
        await sock.sendMessage(jid, {
          text: '⛔ Solo los administradores del grupo pueden usar este comando.'
        }, { quoted: msg })
        return
      }

      // Verificar si el bot es admin
      if (!isBotAdmin) {
        await sock.sendMessage(jid, {
          text: '❌ Necesito ser administrador para usar el anti-link.'
        }, { quoted: msg })
        return
      }

      // Inicializar DB
      initDb()

      // Asegurar configuración del chat
      if (!global.db.data.chats[jid]) {
        global.db.data.chats[jid] = {}
      }

      // Obtener estado actual
      const currentState = global.db.data.chats[jid].antiLink || false

      // Si no hay argumentos, mostrar estado
      if (!args || args.length === 0) {
        await sock.sendMessage(jid, {
          text: `📌 *Estado del Anti-Link*\n\n` +
                `✦ Estado: ${currentState ? '✅ Activado' : '❌ Desactivado'}\n\n` +
                `📝 Comandos:\n` +
                `▸ .antilink on - Activar\n` +
                `▸ .antilink off - Desactivar\n\n` +
                `✦ Detecta enlaces de WhatsApp y Channels\n` +
                `✦ Elimina mensajes y expulsa infractores\n\n` +
                `✦ Admins y Owners están exentos`
        }, { quoted: msg })
        return
      }

      // Procesar comandos
      const action = args[0].toLowerCase()

      if (action === 'on' || action === 'activar' || action === 'enable') {
        global.db.data.chats[jid].antiLink = true

        if (global.db.write && typeof global.db.write === 'function') {
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

        if (global.db.write && typeof global.db.write === 'function') {
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
          text: `❌ Comando inválido.\n\n` +
                `✦ Usa: .antilink on/off\n` +
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

  options: {
    requiresGroup: true,
    requiresAdmin: true,
    requiresBotAdmin: true,
    cooldown: 5
  }
}