// .tablamult — tabla de multiplicar.
const { caja } = require('../../lib/estilo')

module.exports = {
  name: 'tablamult',
  aliases: ['tablademultiplicar'],
  description: 'Tabla de multiplicar: tablamult 7 (o tablamult 7 20 para llegar hasta el 20)',
  category: 'escuela',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const n = Number(args[0])
    const hasta = args[1] === undefined ? 12 : Number(args[1])
    if (!Number.isInteger(n) || Math.abs(n) > 1e6 || !Number.isInteger(hasta) || hasta < 1 || hasta > 30) {
      return sock.sendMessage(jid, { text: `❌ Escribe un número entero (y, si quieres, hasta qué número, máx 30).\n\n📌 Ejemplo: ${config.PREFIXES[0]}tablamult 7` }, { quoted: msg })
    }
    const filas = Array.from({ length: hasta }, (_, i) => `${n} × ${i + 1} = *${n * (i + 1)}*`)
    return sock.sendMessage(jid, { text: caja('✖️', `Tabla del ${n}`, filas) }, { quoted: msg })
  },
}
