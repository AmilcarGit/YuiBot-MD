// .toptrabajos — ranking de quién ganó más monedas con los trabajos.
const T = require('../../lib/trabajos')
const { numeroUsuario } = require('../../lib/juegos')
const { caja } = require('../../lib/estilo')

module.exports = {
  name: 'toptrabajos',
  aliases: ['rankingtrabajos', 'magnates', 'toptrabajo'],
  description: 'Ranking de los que más monedas han ganado con trabajos, minería, pesca, granja…',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const top = T.topTrabajos(10)
    if (!top.length) return sock.sendMessage(jid, { text: `📭 Todavía nadie ha ganado monedas con trabajos.\nSé el primero con *${P}trabajar* o *${P}minar*.` }, { quoted: msg })
    const medallas = ['🥇', '🥈', '🥉']
    const filas = top.map((u, i) => `${medallas[i] || `${i + 1}.`} @${u.numero} — ${T.dinero(u.ganado)} 💰 (${T.dinero(u.veces)} veces)`)
    const yo = numeroUsuario(msg)
    const pos = T.posicionTrabajos(yo)
    const pie = pos ? `Vas en el puesto ${pos} · ${P}upgrades para subir` : `Aún no estás en el ranking · prueba ${P}trabajos`
    return sock.sendMessage(jid, { text: caja('🏆', 'Top trabajadores', filas, pie), mentions: top.map((u) => `${u.numero}@s.whatsapp.net`) }, { quoted: msg })
  },
}
