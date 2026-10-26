// .factorizar — descompone un número en factores primos y da sus divisores.
const { caja } = require('../../lib/estilo')
const { factorizar, factoresATexto, esPrimo, divisores } = require('../../lib/escuelaMate')

module.exports = {
  name: 'factorizar',
  aliases: ['esprimo'],
  description: 'Factores primos, divisores y si es primo: factorizar 360',
  category: 'escuela',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const n = Number(args[0])
    try {
      const f = factorizar(n)
      const filas = [['Número', n, '🔢'], ['¿Primo?', esPrimo(n) ? 'Sí ✅' : 'No', '❓'], ['Factores', factoresATexto(f), '🧩']]
      if (n <= 1e6) {
        const d = divisores(n)
        filas.push(['Divisores', `${d.length}: ${d.slice(0, 24).join(', ')}${d.length > 24 ? '…' : ''}`, '➗'])
      }
      return sock.sendMessage(jid, { text: caja('🧩', 'Factorización', filas) }, { quoted: msg })
    } catch (error) {
      return sock.sendMessage(jid, { text: `❌ ${error.message}\n\n📌 Ejemplo: ${config.PREFIXES[0]}factorizar 360` }, { quoted: msg })
    }
  },
}
