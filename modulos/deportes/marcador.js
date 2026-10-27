// .marcador [liga] — partidos de hoy con marcador en vivo.
const { caja } = require('../../lib/estilo')
const futbol = require('../../lib/futbol')
const { enviarConLista, enviarConBotones, botonesLiga, errorRed } = require('./_comun')

module.exports = {
  name: 'marcador',
  aliases: ['livescore', 'resultadosfutbol'],
  description: 'Partidos de hoy con marcador en vivo: marcador · marcador premier',
  category: 'deportes',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const clave = args.length ? futbol.resolverLiga(args.join(' ')) : null

    if (args.length && !clave) {
      return enviarConLista(sock, jid, msg, config, { texto: `❌ No conozco la liga "${args.join(' ')}". Elige una de la lista:`, comando: 'marcador' })
    }

    try {
      if (clave) {
        const partidos = await futbol.partidosDeHoy(clave)
        const liga = futbol.LIGAS[clave]
        if (partidos === null) return sock.sendMessage(jid, { text: `⚠️ No hay datos de *${liga.nombre}* en este momento.` }, { quoted: msg })
        const filas = partidos.length ? futbol.textoGrupos([{ liga, partidos }]) : [`Hoy no hay partidos en ${liga.nombre}.`, `Mira los próximos con ${P}fixture ${clave}`]
        return enviarConBotones(sock, jid, msg, config, caja('⚽', `Marcador ${liga.nombre}`, filas, 'Hora de Perú · se actualiza cada 30 s'), botonesLiga(P, clave))
      }

      const grupos = await futbol.variasLigas(futbol.LIGAS_PRINCIPALES, (c) => futbol.partidosDeHoy(c))
      const filas = grupos.length ? futbol.textoGrupos(grupos) : ['Hoy no hay partidos en las ligas principales.', 'Elige otra liga en la lista 👇']
      return enviarConLista(sock, jid, msg, config, {
        texto: caja('⚽', 'Marcadores de hoy', filas, 'Hora de Perú · toca "Elegir liga" para ver otra'),
        comando: 'marcador',
        botones: [{ text: '🔴 En vivo', id: `${P}envivo` }, { text: '🏆 Ligas', id: `${P}ligas` }],
      })
    } catch (error) {
      console.error('[FUTBOL]', error)
      return sock.sendMessage(jid, { text: errorRed(error) }, { quoted: msg })
    }
  },
}
