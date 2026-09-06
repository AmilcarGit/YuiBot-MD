//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, apostar, pagar, apuestaDesdeArgs, formatoMonedas, panel } = require('../../lib/juegos')

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
      await sock.sendMessage(msg.key.remoteJid, { text: panel('🃏 BLACKJACK', [`💰 Saldo: *${formatoMonedas(saldo(numero))}*`, '🎯 Apuesta mínima: *20*', '▶️ Usa: */blackjack 100*']) }, { quoted: msg })
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
    await sock.sendMessage(msg.key.remoteJid, { text: panel('🃏 BLACKJACK', [`👤 Tú: *${jugador}*`, `🤖 Yui: *${yui}*`, resultado, premio ? `💰 Premio: *+${formatoMonedas(premio)}*` : `💸 Apuesta: *-${formatoMonedas(apuesta)}*`, `💳 Saldo: *${formatoMonedas(saldo(numero))}*`]) }, { quoted: msg })
  },
}
