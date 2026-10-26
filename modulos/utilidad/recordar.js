// .recordar <cuándo> <texto> — recordatorios persistentes por bot.
const { caja } = require('../../lib/estilo')
const recordatorios = require('../../lib/recordatorios')
const { interpretarDuracion, describirDuracion, formatearFechaPeru } = require('../../lib/fechas')

const MAX_DURACION_MS = 365 * 86400000

module.exports = {
  name: 'recordar',
  aliases: ['recordatorio', 'remind', 'recordatorios'],
  description: 'Te recuerda algo: recordar 30m sacar la ropa · recordar lista · recordar borrar 3',
  category: 'utilidad',

  async execute(sock, msg, args, { config, esSubBot, subbotNumero }) {
    const idBot = esSubBot ? String(subbotNumero) : 'principal'
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numero = remitente.split('@')[0].split(':')[0]
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
    const sub = (args[0] || '').toLowerCase()

    if (sub === 'lista' || sub === 'list' || !args.length) {
      const mias = recordatorios.listarDe(numero)
      if (!mias.length) {
        return responder(`📭 No tienes recordatorios.\n📌 Ejemplo: ${P}recordar 30m sacar la ropa\nUnidades: m, h, d (ej. 1h30m, 2d)`)
      }
      const filas = mias.map((r) => `• #${r.id} — ${formatearFechaPeru(new Date(r.cuando))}\n   ${r.texto}`)
      return responder(`${caja('⏰', 'Tus recordatorios', [`Total: ${mias.length}`])}\n\n${filas.join('\n')}\n\n🗑️ ${P}recordar borrar <id>`)
    }

    if (sub === 'borrar' || sub === 'del' || sub === 'eliminar') {
      const id = parseInt(args[1], 10)
      if (!id) return responder(`❌ Indica el id. Ejemplo: ${P}recordar borrar 3`)
      return responder(recordatorios.borrar(numero, id) ? `🗑️ Recordatorio #${id} eliminado.` : '❌ No encontré ese recordatorio tuyo.')
    }

    const duracion = interpretarDuracion(args[0])
    const texto = args.slice(1).join(' ').trim()
    if (!duracion) {
      return responder(`❌ No entendí el tiempo "${args[0]}".\n📌 Ejemplo: ${P}recordar 30m sacar la ropa (m, h, d)`)
    }
    if (duracion > MAX_DURACION_MS) return responder('❌ El máximo es 1 año.')
    if (!texto) return responder(`❌ Dime qué te recuerdo.\n📌 Ejemplo: ${P}recordar ${args[0]} llamar a mamá`)

    try {
      const r = recordatorios.crear({ idBot, jid, numero, texto, cuando: Date.now() + duracion })
      return responder(caja('⏰', 'Recordatorio creado', [['ID', `#${r.id}`], ['En', describirDuracion(duracion)], ['Fecha', formatearFechaPeru(new Date(r.cuando))], ['Texto', texto]], 'Listo, te lo recordaré'))
    } catch (error) {
      return responder(`❌ ${error.message}`)
    }
  },
}
