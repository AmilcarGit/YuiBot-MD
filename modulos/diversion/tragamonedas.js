//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, apostar, pagar, apuestaDesdeArgs, formatoMonedas, panel } = require('../../lib/juegos')

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
      await sock.sendMessage(msg.key.remoteJid, { text: panel('🎰 TRAGAMONEDAS', [`💰 Saldo: *${formatoMonedas(saldo(numero))}*`, '🎯 Apuesta mínima: *10*', '▶️ Usa: */tragamonedas 100*']) }, { quoted: msg })
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
    await sock.sendMessage(msg.key.remoteJid, { text: panel('🎰 TRAGAMONEDAS', [`┌ ${r.join(' │ ')} ┐`, premio ? `🎉 Premio: *+${formatoMonedas(premio)}*` : '💥 Sin premio esta vez', `${neto >= 0 ? '📈 Ganancia' : '📉 Pérdida'}: *${neto >= 0 ? '+' : ''}${formatoMonedas(neto)}*`, `💰 Saldo: *${formatoMonedas(saldo(numero))}*`]) }, { quoted: msg })
  },
}
