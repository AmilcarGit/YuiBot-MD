//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, apostar, pagar, apuestaDesdeArgs, formatoMonedas, panel } = require('../../lib/juegos')

module.exports = {
  name: 'minas',
  aliases: [],
  description: 'Arriesga monedas en un campo de minas',
  category: 'juegos',
  async execute(sock, msg, args) {
    const numero = numeroUsuario(msg)
    const apuesta = apuestaDesdeArgs(args, 20)
    if (!apuesta) {
      await sock.sendMessage(msg.key.remoteJid, { text: panel('💣 MINAS', [`💰 Saldo: *${formatoMonedas(saldo(numero))}*`, '🎯 Apuesta mínima: *20*', '▶️ Usa: */minas 100*', '🍀 60% de escapar  |  💎 premio x2.5']) }, { quoted: msg })
      return
    }
    const retirada = apostar(numero, apuesta)
    if (!retirada.ok) {
      await sock.sendMessage(msg.key.remoteJid, { text: panel('💣 MINAS', [`❌ Saldo insuficiente`, `💰 Disponible: *${formatoMonedas(retirada.disponible)}*`]) }, { quoted: msg })
      return
    }
    const seguro = Math.random() < 0.6
    const premio = Math.floor(apuesta * 2.5)
    if (seguro) pagar(numero, premio)
    await sock.sendMessage(msg.key.remoteJid, { text: panel('💣 MINAS', [seguro ? '💎 ¡Encontraste una ruta segura!' : '💥 ¡BOOM! Pisaste una mina', seguro ? `🎉 Premio: *+${formatoMonedas(premio)}*` : `💸 Perdiste: *${formatoMonedas(apuesta)}*`, `💰 Saldo: *${formatoMonedas(saldo(numero))}*`]) }, { quoted: msg })
  },
}
