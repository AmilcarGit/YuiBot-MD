// .fraccion — simplifica y opera fracciones.
const { caja } = require('../../lib/estilo')
const { leerFraccion, operarFracciones, fraccionATexto, mixto } = require('../../lib/escuelaMate')

module.exports = {
  name: 'fraccion',
  aliases: ['fracciones'],
  description: 'Simplifica u opera fracciones: fraccion 6/8 · fraccion 1/2 + 3/4',
  category: 'escuela',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const ayuda = `❌ Escribe una fracción o una operación.\n\n📌 Ejemplos:\n${P}fraccion 6/8\n${P}fraccion 1/2 + 3/4\n${P}fraccion 2/3 * 9/4  (operadores: + - * /)`
    try {
      let original, resultado
      if (args.length === 1) {
        resultado = leerFraccion(args[0])
        original = args[0]
      } else if (args.length === 3) {
        const a = leerFraccion(args[0])
        const b = leerFraccion(args[2])
        if (!a || !b) return sock.sendMessage(jid, { text: ayuda }, { quoted: msg })
        resultado = operarFracciones(a, args[1], b)
        original = args.join(' ')
      } else return sock.sendMessage(jid, { text: ayuda }, { quoted: msg })
      if (!resultado) return sock.sendMessage(jid, { text: ayuda }, { quoted: msg })

      const filas = [['Operación', original, '📝'], ['Resultado', fraccionATexto(resultado), '✅']]
      const m = mixto(resultado)
      if (m) filas.push(['Número mixto', m, '🔄'])
      filas.push(['Decimal', Number((resultado.n / resultado.d).toFixed(6)), '🔢'])
      return sock.sendMessage(jid, { text: caja('➗', 'Fracciones', filas) }, { quoted: msg })
    } catch (error) {
      return sock.sendMessage(jid, { text: `❌ ${error.message}` }, { quoted: msg })
    }
  },
}
