//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, apostar, pagar, apuestaDesdeArgs, formatoMonedas, panel } = require('../../lib/juegos')

module.exports = {
  name: 'batalla',
  aliases: [],
  description: 'Desafía a otro usuario por monedas',
  category: 'juegos',
  async execute(sock, msg, args) {
    const numero = numeroUsuario(msg)
    const mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const apuesta = apuestaDesdeArgs(args, 20)
    if (!mencionado || !apuesta) {
      await sock.sendMessage(msg.key.remoteJid, { text: panel('⚔️ BATALLA', [`💰 Tu saldo: *${formatoMonedas(saldo(numero))}*`, '🎯 Usa: */batalla @usuario 100*', '🏆 El ganador recibe el pozo']) }, { quoted: msg })
      return
    }
    const rival = mencionado.split('@')[0].split(':')[0]
    if (rival === numero) {
      await sock.sendMessage(msg.key.remoteJid, { text: panel('⚔️ BATALLA', ['❌ No puedes desafiarte a ti mismo']) }, { quoted: msg })
      return
    }
    const retiroJugador = apostar(numero, apuesta)
    if (!retiroJugador.ok) {
      await sock.sendMessage(msg.key.remoteJid, { text: panel('⚔️ BATALLA', [`❌ No tienes suficientes monedas`, `💰 Disponible: *${formatoMonedas(retiroJugador.disponible)}*`]) }, { quoted: msg })
      return
    }
    const retiroRival = apostar(rival, apuesta)
    if (!retiroRival.ok) {
      pagar(numero, apuesta)
      await sock.sendMessage(msg.key.remoteJid, { text: panel('⚔️ BATALLA', [`❌ El rival no tiene *${formatoMonedas(apuesta)}* monedas`, '💰 Tu apuesta fue devuelta']) }, { quoted: msg })
      return
    }
    const ganador = Math.random() < 0.5 ? numero : rival
    const premio = apuesta * 2
    pagar(ganador, premio)
    const nombreGanador = ganador === numero ? 'Tú' : `@${rival}`
    await sock.sendMessage(msg.key.remoteJid, { text: panel('⚔️ BATALLA', [`👤 Jugador: *@${numero}*`, `⚔️ Rival: *@${rival}*`, `🏆 Ganador: *${nombreGanador}*`, `💰 Premio: *${formatoMonedas(premio)}*`]), mentions: [ganador === numero ? `${numero}@s.whatsapp.net` : mencionado] }, { quoted: msg })
  },
}
