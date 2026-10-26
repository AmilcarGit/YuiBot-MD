//CÓDIGO ORIGINAL DE YUIBOT-MD
const { caja } = require('../../lib/estilo')
const { obtenerDuenoSubbot, esPremium, obtenerNombrePersonalizado } = require('../../lib/subbots')
const { gruposLiderados } = require('../../lib/red')

function formatearDuracion(segundos) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = Math.floor(segundos % 60)
  return `${h}h ${m}m ${s}s`
}

module.exports = {
  name: 'misubbot',
  aliases: ['subbotinfo'],
  description: 'Muestra información de tu propio subbot',
  category: 'subbot',
  subbotOwnerOnly: true,

  async execute(sock, msg, args, { config, esSubBot, subbotNumero }) {
    const jid = msg.key.remoteJid

    if (!esSubBot) {
      return sock.sendMessage(jid, { text: '❌ Este comando solo funciona ejecutado desde un subbot, no desde el bot principal.' }, { quoted: msg })
    }

    const dueno = obtenerDuenoSubbot(subbotNumero)
    const grupos = gruposLiderados(subbotNumero)
    const premium = esPremium(subbotNumero)
    const nombre = obtenerNombrePersonalizado(subbotNumero)

    const texto = caja('🤖', 'Mi subbot', [
      ['Número', `+${subbotNumero}`],
      ['Nombre', nombre || '(sin personalizar)'],
      ['Dueño', dueno?.nombre || 'desconocido', '👤'],
      ['Premium', premium ? '⭐ sí' : 'no'],
      ['Tiempo activo', formatearDuracion(process.uptime()), '🟢'],
      ['Grupos que lidero ahora', grupos.length],
    ], config.BOT_NAME)

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}