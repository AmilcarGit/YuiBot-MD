// .fixture <liga|equipo> — próximos partidos (7 días).
const { caja } = require('../../lib/estilo')
const futbol = require('../../lib/futbol')
const { enviarConLista, enviarConBotones, botonesLiga, errorRed } = require('../../lib/deportesUI')

const DIA_MS = 86400000

module.exports = {
  name: 'fixture',
  aliases: ['proximospartidos', 'calendariofutbol'],
  description: 'Próximos partidos de una liga o equipo: fixture liga1 · fixture Alianza',
  category: 'deportes',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    if (!args.length) {
      return enviarConLista(sock, jid, msg, config, { texto: '📅 *Próximos partidos*\nElige una liga (o escribe un equipo: ' + `${P}fixture Alianza):`, comando: 'fixture' })
    }
    try {
      const clave = futbol.resolverLiga(args.join(' '))
      if (clave) {
        const liga = futbol.LIGAS[clave]
        const ahora = Date.now()
        const partidos = await futbol.obtenerPartidos(clave, { desde: ahora, hasta: ahora + 7 * DIA_MS })
        const proximos = (partidos || []).filter((p) => p.estado === 'pre' || p.estado === 'vivo' || p.estado === 'descanso').sort((a, b) => a.fecha - b.fecha).slice(0, 15)
        if (!proximos.length) return sock.sendMessage(jid, { text: `📭 No hay partidos de *${liga.nombre}* en los próximos 7 días.` }, { quoted: msg })
        return enviarConBotones(sock, jid, msg, config, caja('📅', `Próximos ${liga.nombre}`, proximos.map((p) => futbol.lineaPartido(p, { conDia: true })), 'Hora de Perú'), botonesLiga(P, clave))
      }
      const encontrado = await futbol.buscarEquipo(args.join(' '))
      if (!encontrado) return sock.sendMessage(jid, { text: `📭 No encontré partidos de "${args.join(' ')}" en los próximos 7 días.\nUsa ${P}ligas para ver las ligas disponibles.` }, { quoted: msg })
      const lista = encontrado.partidos.filter((p) => p.estado !== 'final').slice(0, 10)
      return enviarConBotones(sock, jid, msg, config, caja('📅', encontrado.nombre, (lista.length ? lista : encontrado.partidos.slice(-5)).map((p) => futbol.lineaPartido(p, { conDia: true })), 'Hora de Perú'), [
        { text: '🔔 Seguir equipo', id: `${P}seguirequipo ${encontrado.nombre}` },
        { text: '📋 Detalle', id: `${P}infopartido ${encontrado.nombre}` },
      ])
    } catch (error) {
      console.error('[FUTBOL]', error)
      return sock.sendMessage(jid, { text: errorRed(error) }, { quoted: msg })
    }
  },
}
