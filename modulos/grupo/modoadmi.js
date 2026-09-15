//CÓDIGO ORIGINAL DE YUIBOT-MD
const { esAdminDeGrupo } = require('../../lib/moderacion')
const { isOwner, parseCommand } = require('../../lib/handler')
const modoadmi = require('../../lib/modoadmi')

module.exports = {
  name: 'modoadmi',
  aliases: ['modoadmin'],
  description: 'Solo admins/owner pueden usar comandos en el grupo mientras esté activo',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg })
    }

    let metadata
    try {
      metadata = await sock.groupMetadata(jid)
    } catch (error) {
      return sock.sendMessage(jid, { text: '❌ No se pudo obtener la información del grupo.' }, { quoted: msg })
    }

    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numeroRemitente = remitente.split('@')[0].split(':')[0]
    const esAdmin = esAdminDeGrupo(metadata, numeroRemitente)
    const esOwnerBot = config.OWNERS.some((o) => o.numero === numeroRemitente)
    if (!esAdmin && !esOwnerBot) {
      return sock.sendMessage(jid, { text: '⛔ Solo los administradores del grupo pueden usar este comando.' }, { quoted: msg })
    }

    const accion = (args[0] || '').toLowerCase()

    if (accion === 'on') {
      modoadmi.activar(jid)
      return sock.sendMessage(jid, { text: '🔒 *Modo admin activado.*\nSolo admins/owner pueden usar comandos en este grupo.' }, { quoted: msg })
    }
    if (accion === 'off') {
      modoadmi.desactivar(jid)
      return sock.sendMessage(jid, { text: '🔓 *Modo admin desactivado.*\nTodos pueden usar comandos normalmente.' }, { quoted: msg })
    }

    return sock.sendMessage(jid, {
      text: `🛡️ *MODO ADMIN*\n\nEstado: *${modoadmi.estaActivo(jid) ? 'ON 🔒' : 'OFF 🔓'}*\n\nmodoadmi on\nmodoadmi off`,
    }, { quoted: msg })
  },

  async onMessage(sock, msg, ctx) {
    const { jid, body, esGrupo, remitente, numeroRemitente, config, commands } = ctx
    if (!esGrupo || msg.key.fromMe) return
    if (!modoadmi.estaActivo(jid)) return

    try {
      if (isOwner(remitente, config)) return

      const metadata = await sock.groupMetadata(jid)
      if (esAdminDeGrupo(metadata, numeroRemitente)) return

      const parsed = parseCommand(body, config)
      if (!parsed) return // no parece un comando, no se toca (charla normal sigue igual)
      if (!(commands instanceof Map) || !commands.get(parsed.commandName)) return

      // Bloqueo silencioso para miembros normales (sin aviso, para no llenar el grupo de mensajes).
      return true
    } catch (error) {
      console.error('[MODOADMI] Error:', error)
    }
  },
}