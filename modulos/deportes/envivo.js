// .envivo — todos los partidos que se están jugando ahora.
const { caja } = require('../../lib/estilo')
const futbol = require('../../lib/futbol')
const { enviarConBotones, errorRed } = require('./_comun')

module.exports = {
  name: 'envivo',
  aliases: ['live', 'jugandoahora'],
  description: 'Partidos que se están jugando ahora mismo en todas las ligas',
  category: 'deportes',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    try {
      const grupos = await futbol.variasLigas(Object.keys(futbol.LIGAS), (c) => futbol.partidosDeHoy(c))
      const enVivo = grupos
        .map((g) => ({ ...g, partidos: g.partidos.filter((p) => p.estado === 'vivo' || p.estado === 'descanso') }))
        .filter((g) => g.partidos.length)
      const botones = [{ text: '⚽ Marcadores de hoy', id: `${P}marcador` }, { text: '🏆 Ligas', id: `${P}ligas` }]
      if (enVivo.length) {
        const total = enVivo.reduce((t, g) => t + g.partidos.length, 0)
        return enviarConBotones(sock, jid, msg, config, caja('🔴', 'En vivo', futbol.textoGrupos(enVivo), `${total} partido(s) en juego · hora de Perú`), botones)
      }
      const proximos = grupos
        .map((g) => ({ ...g, partidos: g.partidos.filter((p) => p.estado === 'pre') }))
        .filter((g) => g.partidos.length)
      const filas = ['Ahora no hay partidos en juego.']
      if (proximos.length) filas.push('', '*Más tarde hoy*', ...futbol.textoGrupos(proximos.slice(0, 4)).slice(0, 14))
      return enviarConBotones(sock, jid, msg, config, caja('🔴', 'En vivo', filas, 'Hora de Perú'), botones)
    } catch (error) {
      console.error('[FUTBOL]', error)
      return sock.sendMessage(jid, { text: errorRed(error) }, { quoted: msg })
    }
  },
}
