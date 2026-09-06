//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, apostar, pagar, apuestaDesdeArgs, formatoMonedas, panel } = require('../../lib/juegos')
const { enviarJuego } = require('../../lib/juegosVisual')

function carta() {
  return Math.floor(Math.random() * 10) + 1
}

module.exports = {
  name: 'blackjack',
  aliases: [],
  description: 'Juega blackjack contra Yui',
  category: 'juegos',
  async execute(sock, msg, args) {
    const numero = numeroUsuario(msg)
    const apuesta = apuestaDesdeArgs(args, 20)
    if (!apuesta) {
      await enviarJuego(sock, msg, {
        icono: '🃏',
        titulo: 'Blackjack',
        subtitulo: 'Acércate a 21 y vence a Yui.',
        datos: [`💰 Saldo: ${formatoMonedas(saldo(numero))}`, '🎯 Apuesta mínima: 20', '🏆 Victoria = x2  •  🤝 Empate = devolución'],
        botones: [
          { id: '/blackjack 20', text: '🃏 20' },
          { id: '/blackjack 50', text: '🃏 50' },
          { id: '/blackjack 100', text: '🃏 100' },
        ],
        caption: '╭─ ✦ 🃏 BLACKJACK ✦\n│ Juega contra Yui usando tus monedas.\n╰─ 🍃 YuiBot-MD',
      })
      return
    }
    const retirada = apostar(numero, apuesta)
    if (!retirada.ok) {
      await sock.sendMessage(msg.key.remoteJid, { text: panel('🃏 BLACKJACK', [`❌ Saldo insuficiente`, `💰 Disponible: *${formatoMonedas(retirada.disponible)}*`]) }, { quoted: msg })
      return
    }
    const jugador = carta() + carta()
    const yui = carta() + carta()
    let resultado = '💥 Perdiste'
    let premio = 0
    if (jugador <= 21 && (yui > 21 || jugador > yui)) {
      resultado = '🎉 Ganaste'
      premio = apuesta * 2
      pagar(numero, premio)
    } else if (jugador === yui) {
      resultado = '🤝 Empate'
      premio = apuesta
      pagar(numero, premio)
    }
    await enviarJuego(sock, msg, {
      icono: '🃏',
      titulo: 'Blackjack',
      subtitulo: resultado,
      datos: [`👤 Tú: ${jugador}`, `🤖 Yui: ${yui}`, premio ? `💰 Premio: +${formatoMonedas(premio)}` : `💸 Apuesta perdida: ${formatoMonedas(apuesta)}`, `💳 Saldo: ${formatoMonedas(saldo(numero))}`],
      botones: [
        { id: `/blackjack ${apuesta}`, text: '🔄 Repetir' },
        { id: '/blackjack 20', text: '🃏 20' },
        { id: '/blackjack 100', text: '💎 100' },
      ],
      caption: `╭─ ✦ 🃏 BLACKJACK ✦\n│ 👤 Tú: *${jugador}*  vs  🤖 Yui: *${yui}*\n│ ${resultado}\n╰─ 🍃 YuiBot-MD`,
    })
  },
}
