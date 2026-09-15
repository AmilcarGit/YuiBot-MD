//CÓDIGO ORIGINAL DE YUIBOT-MD
const { esAdminDeGrupo } = require('../../lib/moderacion')
const { obtenerReglas, establecerReglas, limpiarReglas } = require('../../lib/reglas')

module.exports = {
  name: 'reglas',
  aliases: ['normas'],
  description: 'Ver o configurar las reglas del grupo',
  category: 'grupo',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    if (!jid.endsWith('@g.us')) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg })
    }

    const accion = (args[0] || '').toLowerCase()

    if (accion !== 'set' && accion !== 'clear') {
      const texto = obtenerReglas(jid)
      return sock.sendMessage(jid, {
        text: texto
          ? `📜 *REGLAS DEL GRUPO*\n\n${texto}`
          : '📜 Este grupo todavía no tiene reglas configuradas.\n\nUn admin puede definirlas con:\n*reglas set <texto>*',
      }, { quoted: msg })
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
      return sock.sendMessage(jid, { text: '⛔ Solo los administradores del grupo pueden cambiar las reglas.' }, { quoted: msg })
    }

    if (accion === 'clear') {
      limpiarReglas(jid)
      return sock.sendMessage(jid, { text: '✅ Reglas eliminadas.' }, { quoted: msg })
    }

    const texto = args.slice(1).join(' ').trim()
    if (!texto) {
      return sock.sendMessage(jid, { text: '⚠️ Escribe el texto de las reglas.\nEjemplo: reglas set 1. Respeto ante todo\\n2. No spam' }, { quoted: msg })
    }

    establecerReglas(jid, texto)
    return sock.sendMessage(jid, { text: '✅ Reglas actualizadas. Usa *reglas* para verlas.' }, { quoted: msg })
  },
}