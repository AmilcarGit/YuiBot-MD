//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, apostar, pagar, apuestaDesdeArgs, formatoMonedas, panel } = require('../../lib/juegos')

module.exports = {
  name: 'caraocruz',
  aliases: [],
  description: 'Apuesta en cara o cruz',
  category: 'juegos',
  async execute(sock, msg, args) {
    const numero = numeroUsuario(msg)
    const apuesta = apuestaDesdeArgs(args, 10)
    const eleccion = String(args?.[1] || '').toLowerCase()
    if (!apuesta || !['cara', 'cruz'].includes(eleccion)) {
      await sock.sendMessage(msg.key.remoteJid, { text: panel('🪙 CARA O CRUZ', [`💰 Saldo: *${formatoMonedas(saldo(numero))}*`, '🎯 Usa: */caraocruz 100 cara*', '🪙 Elige: *cara* o *cruz*']) }, { quoted: msg })
      return
    }
    const retirada = apostar(numero, apuesta)
    if (!retirada.ok) {
      await sock.sendMessage(msg.key.remoteJid, { text: panel('🪙 CARA O CRUZ', [`❌ Saldo insuficiente`, `💰 Disponible: *${formatoMonedas(retirada.disponible)}*`]) }, { quoted: msg })
      return
    }
    const resultado = Math.random() < 0.5 ? 'cara' : 'cruz'
    const gana = resultado === eleccion
    if (gana) pagar(numero, apuesta * 2)
    await sock.sendMessage(msg.key.remoteJid, { text: panel('🪙 CARA O CRUZ', [`🪙 Salió: *${resultado}*`, `🎯 Elegiste: *${eleccion}*`, gana ? `🎉 Premio: *+${formatoMonedas(apuesta * 2)}*` : '💥 Perdiste la apuesta', `💰 Saldo: *${formatoMonedas(saldo(numero))}*`]) }, { quoted: msg })
  },
}
