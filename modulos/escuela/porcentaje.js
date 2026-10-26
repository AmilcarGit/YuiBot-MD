// .porcentaje — cálculos de porcentajes, descuentos y aumentos.
const { caja } = require('../../lib/estilo')
const { porcentajeDe, quePorcentaje, aplicarPorcentaje } = require('../../lib/escuelaMate')

const num = (t) => Number(String(t).replace(',', '.').replace('%', ''))
const bonito = (n) => Number(n.toFixed(4))

module.exports = {
  name: 'porcentaje',
  aliases: ['pct'],
  description: 'Porcentajes: porcentaje 20 de 150 · 30 sobre 150 · 150 -20',
  category: 'escuela',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const [a, op, b] = args
    const ayuda = `❌ No entendí.\n\n📌 Ejemplos:\n${P}porcentaje 20 de 150  → el 20% de 150\n${P}porcentaje 30 sobre 150  → 30 es qué % de 150\n${P}porcentaje 150 -20  → 150 con 20% de descuento\n${P}porcentaje 150 +18  → 150 con 18% de aumento`
    const responder = (titulo, filas, pie) => sock.sendMessage(jid, { text: caja('💯', titulo, filas, pie) }, { quoted: msg })

    if (args.length === 3 && ['de', 'sobre'].includes((op || '').toLowerCase()) && Number.isFinite(num(a)) && Number.isFinite(num(b))) {
      if (op.toLowerCase() === 'de') {
        return responder('Porcentaje', [['Cálculo', `${a}% de ${b}`, '📝'], ['Resultado', bonito(porcentajeDe(num(a), num(b))), '✅']])
      }
      const p = quePorcentaje(num(a), num(b))
      if (p === null) return sock.sendMessage(jid, { text: '❌ El total no puede ser 0.' }, { quoted: msg })
      return responder('Porcentaje', [['Cálculo', `${a} de ${b}`, '📝'], ['Es el', `${bonito(p)}%`, '✅']])
    }

    if (args.length === 2 && Number.isFinite(num(a)) && /^[+-]\d+([.,]\d+)?%?$/.test(op || '')) {
      const p = num(op)
      const final = aplicarPorcentaje(num(a), p)
      const cambio = final - num(a)
      return responder(p < 0 ? 'Descuento' : 'Aumento', [
        ['Precio original', bonito(num(a)), '🏷️'],
        [p < 0 ? 'Descuento' : 'Aumento', `${Math.abs(p)}% (${bonito(Math.abs(cambio))})`, p < 0 ? '⬇️' : '⬆️'],
        ['Precio final', bonito(final), '✅'],
      ])
    }
    return sock.sendMessage(jid, { text: ayuda }, { quoted: msg })
  },
}
