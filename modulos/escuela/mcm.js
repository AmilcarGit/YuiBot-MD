// .mcm — MCM y MCD de varios números.
const { caja } = require('../../lib/estilo')
const { mcd, mcm } = require('../../lib/escuelaMate')

module.exports = {
  name: 'mcm',
  aliases: ['mcd', 'maximocomun'],
  description: 'MCM y MCD de varios números: mcm 12 18 30',
  category: 'escuela',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const nums = args.map(Number)
    if (nums.length < 2 || nums.length > 8 || nums.some((n) => !Number.isInteger(n) || n <= 0 || n > 1e9)) {
      return sock.sendMessage(jid, { text: `❌ Escribe de 2 a 8 enteros positivos.\n\n📌 Ejemplo: ${config.PREFIXES[0]}mcm 12 18 30` }, { quoted: msg })
    }
    const d = nums.reduce(mcd)
    const m = nums.reduce(mcm)
    return sock.sendMessage(jid, {
      text: caja('🔢', 'MCM y MCD', [['Números', nums.join(', '), '📝'], ['MCD', d, '⬇️'], ['MCM', m, '⬆️']], 'MCD = mayor divisor común · MCM = menor múltiplo común'),
    }, { quoted: msg })
  },
}
