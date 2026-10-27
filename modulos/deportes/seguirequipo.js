// .seguirequipo <equipo> — alertas automáticas de goles y resultado en este chat.
const { caja } = require('../../lib/estilo')
const futbol = require('../../lib/futbol')
const alertas = require('../../lib/alertasFutbol')
const { enviarConBotones, errorRed } = require('../../lib/deportesUI')

module.exports = {
  name: 'seguirequipo',
  aliases: ['followteam', 'alertasequipo'],
  description: 'Recibe alertas automáticas de un equipo: seguirequipo Alianza Lima',
  category: 'deportes',

  async execute(sock, msg, args, { config, esSubBot, subbotNumero }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
    if (!args.length) {
      return responder(caja('🔔', 'Seguir equipo', [
        `Escribe: ${P}seguirequipo <equipo>`,
        `Ejemplo: ${P}seguirequipo Alianza Lima`,
        '',
        'Te aviso en este chat cuando empiece el partido, cada gol, expulsión, descanso y el resultado final.',
        `Lista: ${P}misequipos · Dejar de seguir: ${P}dejarequipo <equipo>`,
      ]))
    }
    try {
      const encontrado = await futbol.buscarEquipo(args.join(' '))
      if (!encontrado) return responder(`📭 No encontré partidos de "${args.join(' ')}" en los próximos 7 días, así que no puedo seguirlo todavía.\nPrueba con el nombre completo o mira ${P}ligas.`)
      const numero = (msg.key.participantAlt || msg.key.participant || jid).split('@')[0].split(':')[0]
      const r = alertas.seguir({ idBot: esSubBot ? String(subbotNumero) : 'principal', jid, numero, nombre: encontrado.nombre, claves: encontrado.claves })
      if (!r.ok) {
        return responder(r.motivo === 'repetido' ? `ℹ️ Ya sigues a *${encontrado.nombre}* en este chat.` : `❌ Máximo ${alertas.MAX_POR_CHAT} equipos por chat. Quita alguno con ${P}dejarequipo.`)
      }
      const siguiente = encontrado.partidos.find((p) => p.estado !== 'final') || encontrado.partidos[0]
      return enviarConBotones(sock, jid, msg, config, caja('🔔', 'Siguiendo equipo', [
        ['Equipo', encontrado.nombre, '⚽'],
        ['Próximo', futbol.lineaPartido(siguiente, { conDia: true }), '📅'],
        'Te avisaré aquí de inicio, goles, expulsiones y final.',
      ], 'Los avisos son automáticos'), [
        { text: '📋 Mis equipos', id: `${P}misequipos` },
        { text: '🔕 Dejar de seguir', id: `${P}dejarequipo ${encontrado.nombre}` },
      ])
    } catch (error) {
      console.error('[FUTBOL]', error)
      return responder(errorRed(error))
    }
  },
}
