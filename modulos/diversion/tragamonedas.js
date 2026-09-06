//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, apostar, pagar, apuestaDesdeArgs, formatoMonedas, panel } = require('../../lib/juegos')
const { enviarJuego } = require('../../lib/juegosVisual')

const simbolos = ['🍒', '🍋', '⭐', '💎', '7️⃣']

module.exports = {
  name: 'tragamonedas',
  aliases: [],
  description: 'Juega a la tragamonedas con monedas',
  category: 'juegos',
  async execute(sock, msg, args) {
    const numero = numeroUsuario(msg)
    const apuesta = apuestaDesdeArgs(args, 10)
    if (!apuesta) {
      await enviarJuego(sock, msg, {
        icono: '🎰',
        titulo: 'Tragamonedas',
        subtitulo: 'Gira y prueba tu suerte con la moneda oficial.',
        datos: [`💰 Saldo: ${formatoMonedas(saldo(numero))}`, '🎯 Apuesta mínima: 10', '🍒 2 iguales = x2  •  3 iguales = x5'],
        botones: [
          { id: '/tragamonedas 10', text: '🎰 10' },
          { id: '/tragamonedas 50', text: '🎰 50' },
          { id: '/tragamonedas 100', text: '🎰 100' },
        ],
        caption: '╭─ ✦ 🎰 TRAGAMONEDAS ✦\n│ Elige tu apuesta y gira los rodillos.\n╰─ 🍃 YuiBot-MD',
      })
      return
    }
    const retirada = apostar(numero, apuesta)
    if (!retirada.ok) {
      await sock.sendMessage(msg.key.remoteJid, { text: panel('🎰 TRAGAMONEDAS', [`❌ Saldo insuficiente`, `💰 Disponible: *${formatoMonedas(retirada.disponible)}*`, `🎯 Necesitas: *${formatoMonedas(apuesta)}*`]) }, { quoted: msg })
      return
    }
    const r = [0, 1, 2].map(() => simbolos[Math.floor(Math.random() * simbolos.length)])
    let premio = 0
    if (r[0] === r[1] && r[1] === r[2]) premio = apuesta * 5
    else if (r[0] === r[1] || r[1] === r[2] || r[0] === r[2]) premio = apuesta * 2
    if (premio) pagar(numero, premio)
    const neto = premio - apuesta
    await enviarJuego(sock, msg, {
      icono: '🎰',
      titulo: 'Resultado',
      subtitulo: r.join('  │  '),
      datos: [premio ? `🎉 Premio: +${formatoMonedas(premio)}` : '💥 Sin premio esta vez', `${neto >= 0 ? '📈 Ganancia' : '📉 Pérdida'}: ${neto >= 0 ? '+' : ''}${formatoMonedas(neto)}`, `💰 Saldo: ${formatoMonedas(saldo(numero))}`],
      botones: [
        { id: `/tragamonedas ${apuesta}`, text: '🔄 Repetir' },
        { id: '/tragamonedas 10', text: '🎰 10' },
        { id: '/tragamonedas 100', text: '💎 100' },
      ],
      caption: `╭─ ✦ 🎰 RESULTADO ✦\n│ ${r.join(' │ ')}\n│ ${premio ? '🎉 ¡Ganaste!' : '💥 Esta vez no hubo premio.'}\n╰─ 🍃 YuiBot-MD`,
    })
  },
}
