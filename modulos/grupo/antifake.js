//CÓDIGO ORIGINAL DE YUIBOT-MD
const { esAdminDeGrupo } = require('../../lib/moderacion')
const { obtenerConfig, guardarConfig, numeroPermitido } = require('../../lib/antifake')

module.exports = {
  name: 'antifake',
  description: 'Bloquea/expulsa números fuera de los prefijos permitidos en el grupo',
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
      console.error('[ANTIFAKE]', error)
      return sock.sendMessage(jid, { text: '❌ No se pudo obtener la información del grupo.' }, { quoted: msg })
    }

    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numeroRemitente = remitente.split('@')[0].split(':')[0]
    const esAdmin = esAdminDeGrupo(metadata, numeroRemitente)
    const esOwnerBot = config.OWNERS.some((o) => o.numero === numeroRemitente)
    if (!esAdmin && !esOwnerBot) {
      return sock.sendMessage(jid, { text: '⛔ Solo los administradores del grupo pueden usar este comando.' }, { quoted: msg })
    }

    const cfg = obtenerConfig(jid)
    const accion = (args[0] || 'status').toLowerCase()
    const valor = String(args[1] || '').replace(/[^0-9]/g, '')

    if (accion === 'on') {
      guardarConfig(jid, { enabled: true })
      return sock.sendMessage(jid, { text: '✅ Antifake activado.' }, { quoted: msg })
    }

    if (accion === 'off') {
      guardarConfig(jid, { enabled: false })
      return sock.sendMessage(jid, { text: '✅ Antifake desactivado.' }, { quoted: msg })
    }

    if (accion === 'list' || accion === 'lista') {
      return sock.sendMessage(jid, { text: `Prefijos permitidos:\n${cfg.prefijos.map((p) => `- ${p}`).join('\n')}` }, { quoted: msg })
    }

    if (accion === 'add' || accion === 'agregar') {
      if (!valor) return sock.sendMessage(jid, { text: '⚠️ Usa: antifake add 52' }, { quoted: msg })
      const nuevos = Array.from(new Set([...cfg.prefijos, valor])).sort()
      guardarConfig(jid, { prefijos: nuevos })
      return sock.sendMessage(jid, { text: `✅ Prefijo agregado: ${valor}` }, { quoted: msg })
    }

    if (accion === 'remove' || accion === 'del' || accion === 'quitar') {
      if (!valor) return sock.sendMessage(jid, { text: '⚠️ Usa: antifake remove 52' }, { quoted: msg })
      guardarConfig(jid, { prefijos: cfg.prefijos.filter((p) => p !== valor) })
      return sock.sendMessage(jid, { text: `✅ Prefijo removido: ${valor}` }, { quoted: msg })
    }

    return sock.sendMessage(jid, {
      text: `*ANTIFAKE*\n\nEstado: *${cfg.enabled ? 'ON' : 'OFF'}*\nPrefijos permitidos: *${cfg.prefijos.join(', ')}*\n\nantifake on\nantifake off\nantifake add 52\nantifake remove 52\nantifake list`,
    }, { quoted: msg })
  },

  async onGroupUpdate(sock, update) {
    if (!update?.id || String(update.action).toLowerCase() !== 'add') return

    const cfg = obtenerConfig(update.id)
    if (!cfg.enabled) return

    let metadata = null
    try {
      metadata = await sock.groupMetadata(update.id)
    } catch (error) {
      console.error('[ANTIFAKE] No se pudo leer la metadata del grupo:', error)
      return
    }

    const numeroBot = String(sock.user?.id || '').split('@')[0].split(':')[0]

    for (const participante of update.participants || []) {
      const esObjeto = participante !== null && typeof participante === 'object'
      const jidReal = esObjeto ? (participante.id || participante.jid || participante.lid) : participante
      if (!jidReal) continue

      const numero = String(jidReal).split('@')[0].split(':')[0]
      if (!numero || numeroPermitido(numero, cfg) || numero === numeroBot) continue

      let expulsado = false
      try {
        await sock.groupParticipantsUpdate(update.id, [jidReal], 'remove')
        expulsado = true
      } catch (error) {
        console.error('[ANTIFAKE] No se pudo expulsar (¿el bot es admin?):', error)
      }

      await sock.sendMessage(update.id, {
        text: `🚫 *ANTIFAKE*\n\nNúmero detectado: *+${numero}*\nNo coincide con los prefijos permitidos del grupo.\n${expulsado ? 'Fue expulsado automáticamente.' : 'No pude expulsarlo. Verifica que el bot sea administrador.'}`,
        mentions: [jidReal],
      })
    }
  },
}