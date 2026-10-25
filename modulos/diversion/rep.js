// Reputación compartida entre el bot principal y todos los subbots.
const reputacion = require('../../lib/reputacion')
const { describirDuracion } = require('../../lib/fechas')

function objetivoDe(msg) {
  const info = msg.message?.extendedTextMessage?.contextInfo
  const jid = info?.mentionedJid?.[0] || info?.participant
  return jid ? jid.split('@')[0].split(':')[0] : null
}

module.exports = {
  name: 'rep',
  aliases: ['reputacion', 'darrep'],
  description: 'Da +1 de reputación (cita o menciona) o mira la tuya',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const yo = remitente.split('@')[0].split(':')[0]
    const objetivo = objetivoDe(msg)
    const responder = (text, mentions) => sock.sendMessage(jid, { text, mentions }, { quoted: msg })

    if (!objetivo) {
      return responder(`⭐ Tu reputación: *${reputacion.obtener(yo)}*\n📌 Para dar +1: ${config.PREFIXES[0]}rep (citando o mencionando)`)
    }
    const r = reputacion.dar(yo, objetivo)
    if (!r.ok && r.motivo === 'propio') return responder('❌ No puedes darte reputación a ti mismo.')
    if (!r.ok) return responder(`⏳ Ya le diste +1 a esa persona. Vuelve en ${describirDuracion(r.restante)}.`)
    return responder(`⭐ @${objetivo} recibió +1 de reputación (total: *${r.total}*).`, [`${objetivo}@s.whatsapp.net`])
  },
}
