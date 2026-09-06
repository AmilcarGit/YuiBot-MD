//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, saldo, pagar, formatoMonedas } = require('../../lib/juegos')
const { enviarJuego } = require('../../lib/juegosVisual')

const preguntas = [
  ['¿Cuál es el planeta más cercano al Sol?', 'mercurio'],
  ['¿Cuánto es 8 x 7?', '56'],
  ['¿Cuál es la capital de Perú?', 'lima'],
  ['¿Qué animal es conocido como el rey de la selva?', 'leon'],
  ['¿Cuántos lados tiene un hexágono?', '6'],
  ['¿Cuál es el océano más grande?', 'pacifico'],
  ['¿Qué gas respiramos principalmente del aire?', 'oxigeno'],
  ['¿Cuántos días tiene un año normal?', '365'],
  ['¿Cuántos minutos tiene una hora?', '60'],
  ['¿Cuál es el satélite natural de la Tierra?', 'luna'],
  ['¿Cuánto es 12 x 12?', '144'],
  ['¿Qué color sale al mezclar azul y amarillo?', 'verde'],
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
    await enviarJuego(sock, msg, {
      icono: '🧠',
      titulo: 'Duelo Quiz',
      subtitulo: 'Tienes 30 segundos para responder',
      datos: [`❓ ${pregunta[0]}`, `🏆 Premio: ${formatoMonedas(premio)}`, `💰 Saldo: ${formatoMonedas(saldo(numero))}`],
      caption: '╭─ ✦ 🧠 DUELO QUIZ ✦\n│ ✍️ Responde: */dueloquiz respuesta*\n╰─ 🍃 YuiBot-MD',
      botones: [{ id: '/dueloquiz', text: '🧠 NUEVA PREGUNTA' }, { id: '/menu', text: '🍃 MENÚ' }],
    })
    const listener = async ({ messages }) => {
      const respuestaMsg = messages?.[0]
      if (!respuestaMsg || respuestaMsg.key.remoteJid !== msg.key.remoteJid || respuestaMsg.key.fromMe) return
      const texto = respuestaMsg.message?.conversation || respuestaMsg.message?.extendedTextMessage?.text || respuestaMsg.message?.buttonsResponseMessage?.selectedButtonId || ''
      if (!texto.toLowerCase().startsWith('/dueloquiz ')) return
      const respuesta = texto.slice(10).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (respuesta !== pregunta[1]) return
      pagar(numero, premio)
      await enviarJuego(sock, respuestaMsg, {
        icono: '🏆',
        titulo: 'Duelo Quiz',
        subtitulo: '¡Respuesta correcta!',
        datos: [`🎯 Respuesta: ${respuesta}`, `💰 Ganaste: +${formatoMonedas(premio)}`, `💳 Saldo: ${formatoMonedas(saldo(numero))}`],
        caption: '🎉 ¡Excelente respuesta!',
        botones: [{ id: '/dueloquiz', text: '🧠 OTRA PREGUNTA' }, { id: '/menu', text: '🍃 MENÚ' }],
      })
      sock.ev.off('messages.upsert', listener)
    }
    sock.ev.on('messages.upsert', listener)
    setTimeout(() => sock.ev.off('messages.upsert', listener), 30000)
  },
}
