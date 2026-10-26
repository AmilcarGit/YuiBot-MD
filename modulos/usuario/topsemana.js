// .topsemana — ranking de XP de la semana (lunes a domingo, hora de Perú).
const { caja } = require('../../lib/estilo')
const logros = require('../../lib/logros')

module.exports = {
  name: 'topsemana',
  aliases: ['semanal', 'rankingsemanal', 'topsemanal'],
  description: 'Ranking semanal de XP (se reinicia cada lunes)',
  category: 'usuario',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const top = logros.topSemanal(10)
    if (!top.length) {
      return sock.sendMessage(jid, { text: '📭 Esta semana todavía nadie ha ganado XP. ¡Sé el primero escribiendo en un grupo!' }, { quoted: msg })
    }
    const medallas = ['🥇', '🥈', '🥉']
    const filas = top.map((u, i) => `${medallas[i] || `${i + 1}.`} @${u.numero} — ${u.xp} XP (nivel ${u.nivel})`)
    return sock.sendMessage(jid, {
      text: caja('📆', 'Top de la semana', filas, 'Se reinicia cada lunes · hora de Perú'),
      mentions: top.map((u) => `${u.numero}@s.whatsapp.net`),
    }, { quoted: msg })
  },
}
