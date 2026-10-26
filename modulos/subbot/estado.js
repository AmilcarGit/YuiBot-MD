//CÓDIGO ORIGINAL DE YUIBOT-MD
const { caja } = require('../../lib/estilo')
const { esPremium, obtenerPrefijo } = require('../../lib/subbots')
const { gruposLiderados } = require('../../lib/red')

function formatearDuracion(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = Math.floor(segundos % 60)
  return `${h}h ${m}m ${s}s`
}

module.exports = {
  name: 'estado',
  aliases: ['statusbot', 'subbotstatus'],
  description: 'Muestra el estado de tu subbot premium',
  category: 'subbot',
  subbotOwnerOnly: true,

  async execute(sock, msg, args, { config, esSubBot, subbotNumero }) {
    const jid = msg.key.remoteJid

    if (!esSubBot) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona ejecutado desde un subbot.' }, { quoted: msg })
    }

    if (!esPremium(subbotNumero)) {
      return sock.sendMessage(jid, { text: '⭐ Este comando es exclusivo para subbots premium.' }, { quoted: msg })
    }

    const memoria = process.memoryUsage()
    const grupos = gruposLiderados(subbotNumero)
    const prefijo = obtenerPrefijo(subbotNumero) || config.PREFIXES[0]
    const estadoConexion = sock.user ? '🟢 conectado' : '🔴 desconectado'

    const texto = caja('🤖', 'Estado del subbot', [
      ['Conexión', estadoConexion, '📡'],
      ['Número', `+${subbotNumero}`],
      ['Premium', '⭐ activo'],
      ['Prefijo', prefijo, '⚙️'],
      ['Grupos liderados', grupos.length],
      ['Uptime', formatearDuracion(process.uptime())],
      ['Memoria', `${Math.round(memoria.rss / 1024 / 1024)} MB`],
      ['Node', process.version, '⚙️'],
    ], config.BOT_NAME)

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}
