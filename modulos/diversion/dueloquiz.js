//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, pagar, formatoMonedas, panel } = require('../../lib/juegos')

const preguntas = [
  ['¿Cuál es el planeta más cercano al Sol?', 'mercurio'],
  ['¿Cuánto es 8 x 7?', '56'],
  ['¿Cuál es la capital de Perú?', 'lima'],
  ['¿Qué animal es conocido como el rey de la selva?', 'leon'],
  ['¿Cuántos lados tiene un hexágono?', '6'],
  ['¿Cuál es el océano más grande?', 'pacifico'],
  ['¿Qué gas respiramos principalmente del aire?', 'oxigeno'],
  ['¿Cuántos días tiene un año normal?', '365'],
]

module.exports = {
  name: 'dueloquiz',
  aliases: [],
  description: 'Responde una pregunta y gana monedas',
  category: 'juegos',
  async execute(sock, msg) {
    const numero = numeroUsuario(msg)
    const pregunta = preguntas[Math.floor(Math.random() * preguntas.length)]
    const premio = Math.floor(Math.random() * 81) + 70
    await sock.sendMessage(msg.key.remoteJid, { text: panel('🧠 DUELO QUIZ', [`❓ *${pregunta[0]}*`, `🏆 Premio: *${formatoMonedas(premio)} monedas*`, '✍️ Responde con el comando:', `*/dueloquiz respuesta*`, `💰 Saldo actual: *${formatoMonedas(saldo(numero))}*`]) }, { quoted: msg })
    const listener = async ({ messages }) => {
      const respuestaMsg = messages?.[0]
      if (!respuestaMsg || respuestaMsg.key.remoteJid !== msg.key.remoteJid || respuestaMsg.key.fromMe) return
      const texto = respuestaMsg.message?.conversation || respuestaMsg.message?.extendedTextMessage?.text || ''
      if (!texto.toLowerCase().startsWith('/dueloquiz ')) return
      const respuesta = texto.slice(10).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (respuesta !== pregunta[1]) return
      pagar(numero, premio)
      await sock.sendMessage(msg.key.remoteJid, { text: panel('🧠 DUELO QUIZ', [`🎉 ¡Respuesta correcta!`, `💰 Ganaste: *+${formatoMonedas(premio)}*`, `💳 Saldo: *${formatoMonedas(saldo(numero))}*`]) }, { quoted: respuestaMsg })
      sock.ev.off('messages.upsert', listener)
    }
    sock.ev.on('messages.upsert', listener)
    setTimeout(() => sock.ev.off('messages.upsert', listener), 30000)
  },
}
