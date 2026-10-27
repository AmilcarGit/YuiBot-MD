// .infopartido <equipo> — detalle de su partido (goles, expulsiones, estadio).
const { caja } = require('../../lib/estilo')
const futbol = require('../../lib/futbol')
const { enviarConBotones, errorRed } = require('../../lib/deportesUI')

// Prefiere el que se juega ahora, luego el de hoy y por último el más cercano.
function elegirPartido(partidos, ahora = Date.now()) {
  const vivo = partidos.find((p) => p.estado === 'vivo' || p.estado === 'descanso')
  if (vivo) return vivo
  return [...partidos].sort((a, b) => Math.abs(a.fecha - ahora) - Math.abs(b.fecha - ahora))[0]
}

module.exports = {
  name: 'infopartido',
  aliases: ['matchinfo', 'detallepartido'],
  description: 'Detalle del partido de un equipo: infopartido Alianza Lima',
  category: 'deportes',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    if (!args.length) return sock.sendMessage(jid, { text: `❌ Escribe el equipo.\n\n📌 Ejemplo: ${P}infopartido Real Madrid` }, { quoted: msg })
    try {
      const encontrado = await futbol.buscarEquipo(args.join(' '))
      if (!encontrado) return sock.sendMessage(jid, { text: `📭 No encontré partidos de "${args.join(' ')}" (hoy ni en los próximos 7 días).` }, { quoted: msg })
      const p = elegirPartido(encontrado.partidos)
      return enviarConBotones(sock, jid, msg, config, caja('⚽', p.liga, futbol.textoDetallePartido(p), 'Hora de Perú'), [
        { text: '🔔 Seguir equipo', id: `${P}seguirequipo ${encontrado.nombre}` },
        { text: '📊 Tabla', id: `${P}tablaliga ${p.slug === 'per.1' ? 'liga1' : encontrado.claves[0]}` },
        { text: '🔴 En vivo', id: `${P}envivo` },
      ])
    } catch (error) {
      console.error('[FUTBOL]', error)
      return sock.sendMessage(jid, { text: errorRed(error) }, { quoted: msg })
    }
  },
  _internos: { elegirPartido },
}
