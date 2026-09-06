//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, apostar, pagar, apuestaDesdeArgs, formatoMonedas, panel } = require('../../lib/juegos')

module.exports = {
  name: 'dados',
  aliases: [],
  description: 'Apuesta por el resultado de los dados',
  category: 'juegos',
  async execute(sock, msg, args) {
    const numero = numeroUsuario(msg)
    const apuesta = apuestaDesdeArgs(args, 10)
    const eleccion = String(args?.[1] || '').toLowerCase()
    if (!apuesta || !['alto', 'bajo'].includes(eleccion)) {
      await sock.sendMessage(msg.key.remoteJid, { text: panel('🎲 DADOS', [`💰 Saldo: *${formatoMonedas(saldo(numero))}*`, '🎯 Usa: */dados 100 alto*', '🔻 bajo = 2-6  |  🔺 alto = 8-12']) }, { quoted: msg })
      return
    }
    const retirada = apostar(numero, apuesta)
    if (!retirada.ok) {
      await sock.sendMessage(msg.key.remoteJid, { text: panel('🎲 DADOS', [`❌ Saldo insuficiente`, `💰 Disponible: *${formatoMonedas(retirada.disponible)}*`]) }, { quoted: msg })
      return
    }
    const a = Math.floor(Math.random() * 6) + 1
    const b = Math.floor(Math.random() * 6) + 1
    const total = a + b
    const gana = eleccion === 'alto' ? total >= 8 : total <= 6
    if (gana) pagar(numero, apuesta * 2)
    await sock.sendMessage(msg.key.remoteJid, { text: panel('🎲 DADOS', [`🎲 Resultado: *${a} + ${b} = ${total}*`, `🎯 Elección: *${eleccion}*`, gana ? `🎉 Ganaste *+${formatoMonedas(apuesta * 2)}*` : '💥 Perdiste la apuesta', `💰 Saldo: *${formatoMonedas(saldo(numero))}*`]) }, { quoted: msg })
  },
}
