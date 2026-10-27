// .tablaliga <liga> — tabla de posiciones.
const { caja } = require('../../lib/estilo')
const futbol = require('../../lib/futbol')
const { enviarConLista, enviarConBotones, errorRed } = require('./_comun')

module.exports = {
  name: 'tablaliga',
  aliases: ['posiciones', 'clasificacion'],
  description: 'Tabla de posiciones de una liga: tablaliga premier',
  category: 'deportes',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const clave = futbol.resolverLiga(args.join(' '))
    if (!clave) {
      return enviarConLista(sock, jid, msg, config, {
        texto: args.length ? `❌ No conozco la liga "${args.join(' ')}". Elige una:` : '📊 *Tabla de posiciones*\nElige una liga:',
        comando: 'tablaliga',
      })
    }
    try {
      const liga = futbol.LIGAS[clave]
      const grupos = await futbol.obtenerTabla(clave)
      if (!grupos?.length) return sock.sendMessage(jid, { text: `⚠️ No hay tabla disponible para *${liga.nombre}* (puede que no sea un torneo de liga).` }, { quoted: msg })
      const limite = grupos.length > 1 ? 8 : 20
      return enviarConBotones(sock, jid, msg, config, caja('📊', liga.nombre, futbol.textoTabla(grupos, limite), 'PJ jugados · DG diferencia de gol · PTS puntos'), [
        { text: '⚽ Marcador', id: `${P}marcador ${clave}` },
        { text: '📅 Próximos', id: `${P}fixture ${clave}` },
      ])
    } catch (error) {
      console.error('[FUTBOL]', error)
      return sock.sendMessage(jid, { text: errorRed(error) }, { quoted: msg })
    }
  },
}
