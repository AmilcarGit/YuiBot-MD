//CÓDIGO ORIGINAL DE YUIBOT-MD
const { esAdminDeGrupo } = require('../../lib/moderacion')
const { estaEnWhitelist } = require('../../lib/whitelist')
const { isOwner } = require('../../lib/handler')
const antibot = require('../../lib/antibot')

function extraerNombreComando(texto, prefijos) {
  const valor = String(texto || '').trim()
  if (!valor) return ''

  const lista = Array.isArray(prefijos) && prefijos.length ? prefijos : ['.']
  const prefijo = [...lista].sort((a, b) => b.length - a.length).find((p) => valor.startsWith(p))
  if (!prefijo) return ''

  const resto = valor.slice(prefijo.length).trim()
  if (!resto) return ''

  return resto.split(/\s+/)[0].toLowerCase()
}

module.exports = {
  name: 'antibot',
  aliases: ['anticlone'],
  description: 'Detecta bots clon por comportamiento (comandos rápidos + nombre sospechoso)',
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
      antibot.activar(jid)
      return sock.sendMessage(jid, { text: '✅ Antibot (clon) activado en este grupo.' }, { quoted: msg })
    }
    if (accion === 'off') {
      antibot.desactivar(jid)
      return sock.sendMessage(jid, { text: '✅ Antibot (clon) desactivado en este grupo.' }, { quoted: msg })
    }

    return sock.sendMessage(jid, {
      text: `🤖 *ANTIBOT CLON*\n\nEstado: *${antibot.estaActivo(jid) ? 'ON ✅' : 'OFF ❌'}*\n\nDetecta cuentas que ejecutan comandos válidos muy rápido Y tienen nombre de perfil sospechoso ("bot", "asistente", etc).\n\nantibot on\nantibot off`,
    }, { quoted: msg })
  },

  async onMessage(sock, msg, ctx) {
    const { jid, body, esGrupo, remitente, numeroRemitente, config, commands } = ctx
    if (!esGrupo || msg.key.fromMe) return
    if (!antibot.estaActivo(jid)) return

    try {
      if (isOwner(remitente, config) || estaEnWhitelist(jid, numeroRemitente)) return

      const metadata = await sock.groupMetadata(jid)
      if (esAdminDeGrupo(metadata, numeroRemitente)) return

      const nombreComando = extraerNombreComando(body, config.PREFIXES)
      if (!nombreComando) return
      if (!(commands instanceof Map) || !commands.get(nombreComando)) return
      if (!antibot.pareceNombreDeBot(msg.pushName)) return

      const resultado = antibot.registrarIntento(jid, numeroRemitente)
      if (!resultado.disparado) return

      await sock.sendMessage(jid, { delete: msg.key })

      if (resultado.shouldKick) {
        try {
          await sock.groupParticipantsUpdate(jid, [remitente], 'remove')
          await sock.sendMessage(jid, {
            text: `🚫 Antibot: @${numeroRemitente} expulsado por comportamiento de bot clon.`,
            mentions: [remitente],
          })
        } catch (error) {
          await sock.sendMessage(jid, {
            text: `⚠️ Antibot: @${numeroRemitente} detectado como bot clon, pero no pude expulsarlo.`,
            mentions: [remitente],
          })
        }
      } else {
        await sock.sendMessage(jid, {
          text: `⚠️ Antibot: @${numeroRemitente} comportamiento sospechoso.\nStrike: ${resultado.strikes}/${resultado.maxStrikes}`,
          mentions: [remitente],
        })
      }
    } catch (error) {
      console.error('[ANTIBOT] Error:', error)
    }
  },
}