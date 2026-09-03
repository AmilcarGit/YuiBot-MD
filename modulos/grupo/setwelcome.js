//CÓDIGO ORIGINAL DE YUIBOT-MD
const { guardarGrupo } = require('../../lib/db')
const { esAdminDeGrupo } = require('../../lib/moderacion')

module.exports = {
  name: 'setwelcome',
  aliases: ['setbienvenida'],
  description: 'Personaliza el texto de bienvenida del grupo (usa @user y @grupo, o "reset")',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]

    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg })
    }

    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numero = remitente.split('@')[0].split(':')[0]

    let metadata
    try {
      metadata = await sock.groupMetadata(jid)
    } catch (error) {
      return sock.sendMessage(jid, { text: '❌ No se pudo leer la información del grupo.' }, { quoted: msg })
    }

    const esOwnerBot = config.OWNERS.some((o) => o.numero === numero)
    if (!esAdminDeGrupo(metadata, numero) && !esOwnerBot) {
      return sock.sendMessage(jid, { text: '⛔ Solo los administradores del grupo pueden usar este comando.' }, { quoted: msg })
    }

    const texto = args.join(' ').trim()

    if (!texto) {
      return sock.sendMessage(
        jid,
        {
          text:
            `❌ Escribe el texto de bienvenida.\n\n` +
            `📌 Ejemplo: ${prefijo}setwelcome ¡Bienvenido @user a @grupo! 🎉\n` +
            `📌 Para restaurar el mensaje por defecto: ${prefijo}setwelcome reset\n\n` +
            `Puedes usar @user (menciona al nuevo) y @grupo (nombre del grupo).`
        },
        { quoted: msg }
      )
    }

    if (texto.toLowerCase() === 'reset') {
      guardarGrupo(jid, { textoBienvenida: null })
      return sock.sendMessage(jid, { text: '✅ Se restauró el mensaje de bienvenida por defecto.' }, { quoted: msg })
    }

    guardarGrupo(jid, { textoBienvenida: texto })
    await sock.sendMessage(jid, { text: '✅ Texto de bienvenida actualizado.' }, { quoted: msg })
  },
}