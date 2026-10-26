//CÓDIGO ORIGINAL DE YUIBOT-MD
const { caja } = require('../../lib/estilo')
const { esAdminDeGrupo } = require('../../lib/moderacion')
const { obtenerWhitelist, agregarAWhitelist, quitarDeWhitelist, limpiarWhitelist } = require('../../lib/whitelist')

function extraerNumeroObjetivo(msg, argsRestantes) {
  const mencion = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  if (mencion) return mencion.split('@')[0].split(':')[0]

  const citado = msg.message?.extendedTextMessage?.contextInfo?.participant
  if (citado) return citado.split('@')[0].split(':')[0]

  const numeroArg = String(argsRestantes[0] || '').replace(/[^0-9]/g, '')
  return numeroArg || null
}

module.exports = {
  name: 'whitelist',
  aliases: ['wl'],
  description: 'Excluye usuarios de los filtros anti-* del grupo (antilink, antifake, etc.)',
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
      console.error('[WHITELIST]', error)
      return sock.sendMessage(jid, { text: '❌ No se pudo obtener la información del grupo.' }, { quoted: msg })
    }

    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numeroRemitente = remitente.split('@')[0].split(':')[0]
    const esAdmin = esAdminDeGrupo(metadata, numeroRemitente)
    const esOwnerBot = config.OWNERS.some((o) => o.numero === numeroRemitente)

    if (!esAdmin && !esOwnerBot) {
      return sock.sendMessage(jid, { text: '⛔ Solo los administradores del grupo pueden usar este comando.' }, { quoted: msg })
    }

    const accion = (args[0] || 'list').toLowerCase()

    if (['list', 'lista', 'ver'].includes(accion)) {
      const lista = obtenerWhitelist(jid)
      const items = lista.length ? lista.map((n, i) => `${i + 1}. +${n}`) : ['Sin usuarios en whitelist.']
      return sock.sendMessage(jid, {
        text: caja('🛡️', 'Whitelist del grupo', [
          ['Total', lista.length, '👥'],
          '',
          ...items,
          '',
          '📌 whitelist add @usuario',
          '📌 whitelist del @usuario',
          '📌 whitelist clear',
        ]),
      }, { quoted: msg })
    }

    if (['clear', 'limpiar', 'reset'].includes(accion)) {
      limpiarWhitelist(jid)
      return sock.sendMessage(jid, { text: '✅ Whitelist limpiada para este grupo.' }, { quoted: msg })
    }

    if (['add', 'agregar'].includes(accion)) {
      const numero = extraerNumeroObjetivo(msg, args.slice(1))
      if (!numero) {
        return sock.sendMessage(jid, { text: '⚠️ Menciona, responde o indica el número a agregar.\nEjemplo: whitelist add @usuario' }, { quoted: msg })
      }
      const resultado = agregarAWhitelist(jid, numero)
      return sock.sendMessage(jid, {
        text: caja(resultado.existed ? 'ℹ️' : '✅', 'Whitelist', [
          ['Estado', resultado.existed ? 'Ya estaba en whitelist' : 'Agregado a whitelist', '📋'],
          ['Usuario', `@${numero}`, '👤'],
          ['Total', resultado.total, '👥'],
        ]),
        mentions: [`${numero}@s.whatsapp.net`],
      }, { quoted: msg })
    }

    if (['del', 'quitar', 'remove', 'rm'].includes(accion)) {
      const numero = extraerNumeroObjetivo(msg, args.slice(1))
      if (!numero) {
        return sock.sendMessage(jid, { text: '⚠️ Menciona, responde o indica el número a quitar.\nEjemplo: whitelist del @usuario' }, { quoted: msg })
      }
      const resultado = quitarDeWhitelist(jid, numero)
      return sock.sendMessage(jid, {
        text: caja(resultado.removed ? '✅' : 'ℹ️', 'Whitelist', [
          ['Estado', resultado.removed ? 'Removido de whitelist' : 'No estaba en whitelist', '📋'],
          ['Usuario', `@${numero}`, '👤'],
          ['Total', resultado.total, '👥'],
        ]),
        mentions: [`${numero}@s.whatsapp.net`],
      }, { quoted: msg })
    }

    return sock.sendMessage(jid, {
      text: caja('🛡️', 'Whitelist', [
        '📌 whitelist list',
        '📌 whitelist add @usuario',
        '📌 whitelist del @usuario',
        '📌 whitelist clear',
      ]),
    }, { quoted: msg })
  },
}