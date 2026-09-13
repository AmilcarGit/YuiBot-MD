//CÓDIGO ORIGINAL DE YUIBOT-MD
const { esAdminDeGrupo } = require('../../lib/moderacion')
const { estaEnWhitelist } = require('../../lib/whitelist')
const { isOwner } = require('../../lib/handler')
const antiinsultos = require('../../lib/antiinsultos')

module.exports = {
  name: 'antiinsultos',
  aliases: ['antitoxicos'],
  description: 'Elimina mensajes con insultos y expulsa tras varios avisos',
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
      antiinsultos.activar(jid)
      return sock.sendMessage(jid, { text: '✅ Antiinsultos activado.' }, { quoted: msg })
    }
    if (accion === 'off') {
      antiinsultos.desactivar(jid)
      return sock.sendMessage(jid, { text: '✅ Antiinsultos desactivado.' }, { quoted: msg })
    }
    if (accion === 'add' && args[1]) {
      const palabra = args.slice(1).join(' ').toLowerCase()
      const lista = antiinsultos.leerPalabras()
      if (!lista.includes(palabra)) {
        lista.push(palabra)
        antiinsultos.guardarPalabras(lista)
      }
      return sock.sendMessage(jid, { text: `✅ Palabra agregada a la lista (${lista.length} en total).` }, { quoted: msg })
    }
    if (accion === 'del' && args[1]) {
      const palabra = args.slice(1).join(' ').toLowerCase()
      antiinsultos.guardarPalabras(antiinsultos.leerPalabras().filter((p) => p !== palabra))
      return sock.sendMessage(jid, { text: '✅ Palabra removida de la lista.' }, { quoted: msg })
    }

    return sock.sendMessage(jid, {
      text: `🛡️ *ANTIINSULTOS*\n\nEstado: *${antiinsultos.estaActivo(jid) ? 'ON ✅' : 'OFF ❌'}*\nPalabras en lista: *${antiinsultos.leerPalabras().length}*\n\nantiinsultos on\nantiinsultos off\nantiinsultos add <palabra>\nantiinsultos del <palabra>\n\n📌 ${antiinsultos.MAX_AVISOS} avisos = expulsión`,
    }, { quoted: msg })
  },

  async onMessage(sock, msg, ctx) {
    const { jid, body, esGrupo, remitente, numeroRemitente, config } = ctx
    if (!esGrupo || msg.key.fromMe) return
    if (!antiinsultos.estaActivo(jid)) return

    try {
      if (isOwner(remitente, config) || estaEnWhitelist(jid, numeroRemitente)) return

      const metadata = await sock.groupMetadata(jid)
      if (esAdminDeGrupo(metadata, numeroRemitente)) return

      const palabra = antiinsultos.contienePalabraProhibida(body)
      if (!palabra) return

      await sock.sendMessage(jid, { delete: msg.key })
      const aviso = antiinsultos.registrarAviso(jid, numeroRemitente)

      if (aviso.shouldKick) {
        antiinsultos.limpiarAvisos(jid, numeroRemitente)
        try {
          await sock.groupParticipantsUpdate(jid, [remitente], 'remove')
          await sock.sendMessage(jid, {
            text: `🚫 @${numeroRemitente} fue expulsado por insultar repetidamente (${aviso.maxAvisos} avisos).`,
            mentions: [remitente],
          })
        } catch (error) {
          await sock.sendMessage(jid, {
            text: `⚠️ @${numeroRemitente} superó el límite de avisos por insultos, pero no pude expulsarlo.`,
            mentions: [remitente],
          })
        }
        return
      }

      await sock.sendMessage(jid, {
        text: `🚫 @${numeroRemitente}, cuida tu lenguaje. Aviso ${aviso.count}/${aviso.maxAvisos}.`,
        mentions: [remitente],
      })
    } catch (error) {
      console.error('[ANTIINSULTOS] Error:', error)
    }
  },
}