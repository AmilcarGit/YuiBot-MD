//CÓDIGO ORIGINAL DE YUIBOT-MD
const { agregarMonedasConBoost } = require('../../lib/db')

const PREGUNTAS = [
  { pregunta: '¿Cuál es el planeta más grande del sistema solar?', opciones: ['Marte', 'Júpiter', 'Saturno', 'Tierra'], correcta: 1 },
  { pregunta: '¿En qué país se originó el anime?', opciones: ['China', 'Corea del Sur', 'Japón', 'Tailandia'], correcta: 2 },
  { pregunta: '¿Cuántos huesos tiene el cuerpo humano adulto?', opciones: ['186', '206', '226', '246'], correcta: 1 },
  { pregunta: '¿Cuál es el río más largo del mundo?', opciones: ['Nilo', 'Amazonas', 'Yangtsé', 'Misisipi'], correcta: 1 },
  { pregunta: '¿Qué gas respiramos principalmente para vivir?', opciones: ['Dióxido de carbono', 'Nitrógeno', 'Oxígeno', 'Hidrógeno'], correcta: 2 },
  { pregunta: '¿Quién pintó la Mona Lisa?', opciones: ['Van Gogh', 'Picasso', 'Da Vinci', 'Miguel Ángel'], correcta: 2 },
  { pregunta: '¿Cuál es el idioma más hablado del mundo como lengua nativa?', opciones: ['Inglés', 'Español', 'Mandarín', 'Hindi'], correcta: 2 },
]

module.exports = {
  name: 'trivia',
  aliases: ['pregunta', 'quiz'],
  description: 'Responde una pregunta de trivia y gana monedas',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const remitenteOriginal = msg.key.participantAlt || msg.key.participant || jid

    const item = PREGUNTAS[Math.floor(Math.random() * PREGUNTAS.length)]

    let texto = `🧠 *TRIVIA*\n\n${item.pregunta}\n\n`
    item.opciones.forEach((opcion, i) => {
      texto += `${i + 1}. ${opcion}\n`
    })
    texto += `\n╰─➤ _Responde con el número correcto (30 segundos)_ 🥀`

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })

    const respuesta = await new Promise((resolve) => {
      const escuchar = (upsert) => {
        const nuevoMsg = upsert.messages?.[0]
        if (!nuevoMsg?.message) return
        const remitenteNuevo = nuevoMsg.key.participantAlt || nuevoMsg.key.participant || nuevoMsg.key.remoteJid
        if (nuevoMsg.key.remoteJid !== jid || remitenteNuevo !== remitenteOriginal) return

        const texto = nuevoMsg.message.conversation || nuevoMsg.message.extendedTextMessage?.text || ''
        const numero = parseInt(texto.trim(), 10)
        if (numero >= 1 && numero <= item.opciones.length) {
          sock.ev.off('messages.upsert', escuchar)
          resolve(numero)
        }
      }
      sock.ev.on('messages.upsert', escuchar)
      setTimeout(() => {
        sock.ev.off('messages.upsert', escuchar)
        resolve(null)
      }, 30000)
    })

    const numeroRemitente = remitenteOriginal.split('@')[0].split(':')[0]

    if (respuesta === null) {
      return sock.sendMessage(
        jid,
        { text: `⌛ Se acabó el tiempo. La respuesta correcta era: *${item.opciones[item.correcta]}*` },
        { quoted: msg }
      )
    }

    if (respuesta - 1 === item.correcta) {
      const recompensa = config.ECONOMIA?.TRIVIA_RECOMPENSA ?? 50
      const balance = agregarMonedasConBoost(numeroRemitente, recompensa)
      return sock.sendMessage(
        jid,
        { text: `✅ ¡Correcto! Ganaste *${recompensa}* monedas.\n💰 Balance: ${balance} monedas.` },
        { quoted: msg }
      )
    }

    await sock.sendMessage(
      jid,
      { text: `❌ Incorrecto. La respuesta correcta era: *${item.opciones[item.correcta]}*` },
      { quoted: msg }
    )
  },
}