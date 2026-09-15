//CÓDIGO ORIGINAL DE YUIBOT-MD
const { esAdminDeGrupo } = require('../../lib/moderacion')
const { obtenerConfig, guardarConfig, esHoraValida } = require('../../lib/horariogrupo')

module.exports = {
  name: 'horariogrupo',
  aliases: ['horario'],
  description: 'Configura un horario de apertura/cierre automático para el grupo',
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
    const cfg = obtenerConfig(jid)

    if (accion === 'off') {
      guardarConfig(jid, { enabled: false, ultimoEstado: null })
      return sock.sendMessage(jid, { text: '✅ Horario automático desactivado.' }, { quoted: msg })
    }

    if (accion === 'on') {
      const apertura = args[1] || cfg.apertura
      const cierre = args[2] || cfg.cierre

      if (!esHoraValida(apertura) || !esHoraValida(cierre)) {
        return sock.sendMessage(jid, { text: '⚠️ Formato de hora inválido. Usa HH:MM (24h).\nEjemplo: horariogrupo on 08:00 23:00' }, { quoted: msg })
      }

      guardarConfig(jid, { enabled: true, apertura, cierre, ultimoEstado: null })
      return sock.sendMessage(jid, {
        text: `✅ Horario activado: el grupo estará abierto de *${apertura}* a *${cierre}* (hora del servidor).`,
      }, { quoted: msg })
    }

    return sock.sendMessage(jid, {
      text: `⏰ *HORARIO DEL GRUPO*\n\nEstado: *${cfg.enabled ? 'ON ✅' : 'OFF ❌'}*\nHorario: *${cfg.apertura} - ${cfg.cierre}* (hora del servidor)\n\nhorariogrupo on 08:00 23:00\nhorariogrupo off`,
    }, { quoted: msg })
  },
}