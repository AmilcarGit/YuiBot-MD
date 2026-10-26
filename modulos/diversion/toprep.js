const { caja } = require('../../lib/estilo')
const reputacion = require('../../lib/reputacion')

module.exports = {
  name: 'toprep',
  aliases: ['rankrep', 'topreputacion'],
  description: 'Ranking global de reputación',
  category: 'diversion',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const lista = reputacion.top(10)
    if (!lista.length) return sock.sendMessage(jid, { text: '📭 Aún nadie tiene reputación. Usa rep citando a alguien.' }, { quoted: msg })
    const medallas = ['🥇', '🥈', '🥉']
    const filas = lista.map((u, i) => `${medallas[i] || `${i + 1}.`} @${u.numero} — ${u.reputacion}`)
    return sock.sendMessage(jid, {
      text: caja('🏆', 'Top reputación', filas, 'Usa rep citando a alguien ⭐'),
      mentions: lista.map((u) => `${u.numero}@s.whatsapp.net`),
    }, { quoted: msg })
  },
}
