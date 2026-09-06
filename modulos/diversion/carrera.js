//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, apostar, pagar, apuestaDesdeArgs, formatoMonedas, panel } = require('../../lib/juegos')

module.exports = {
  name: 'carrera',
  aliases: [],
  description: 'Apuesta por un corredor y gana monedas',
  category: 'juegos',
  async execute(sock, msg, args) {
    const numero = numeroUsuario(msg)
    const apuesta = apuestaDesdeArgs(args, 20)
    const corredor = Number(args?.[1])
    if (!apuesta || ![1, 2, 3, 4].includes(corredor)) {
      await sock.sendMessage(msg.key.remoteJid, { text: panel('🏇 CARRERA', [`💰 Saldo: *${formatoMonedas(saldo(numero))}*`, '🎯 Usa: */carrera 100 2*', '🏇 Corredores disponibles: *1, 2, 3, 4*', '🏆 Premio al acertar: *x3*']) }, { quoted: msg })
      return
    }
    const retirada = apostar(numero, apuesta)
    if (!retirada.ok) {
      await sock.sendMessage(msg.key.remoteJid, { text: panel('🏇 CARRERA', [`❌ Saldo insuficiente`, `💰 Disponible: *${formatoMonedas(retirada.disponible)}*`]) }, { quoted: msg })
      return
    }
    const ganador = Math.floor(Math.random() * 4) + 1
    const gana = corredor === ganador
    if (gana) pagar(numero, apuesta * 3)
    await sock.sendMessage(msg.key.remoteJid, { text: panel('🏇 CARRERA', [`🏁 Ganador: *Corredor ${ganador}*`, `🎯 Elegiste: *Corredor ${corredor}*`, gana ? `🏆 Premio: *+${formatoMonedas(apuesta * 3)}*` : '💥 Tu corredor perdió', `💰 Saldo: *${formatoMonedas(saldo(numero))}*`]) }, { quoted: msg })
  },
}
