// .tts [voz|idioma] <texto> — texto a voz gratis (ver lib/tts.js).
const tts = require('../../lib/tts')

module.exports = {
  name: 'tts',
  aliases: ['voz', 'texttospeech'],
  description: 'Convierte texto a voz (tts lupe Hola · tts en Hello)',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })

    const citado = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const textoCitado = citado?.conversation || citado?.extendedTextMessage?.text || ''

    let seleccion = tts.VOZ_DEFECTO
    let resto = args
    if (args.length && tts.esSeleccion(args[0].toLowerCase())) {
      seleccion = args[0].toLowerCase()
      resto = args.slice(1)
    }
    const texto = resto.join(' ').trim() || textoCitado.trim()

    if (!texto) {
      return responder(
        `❌ Escribe el texto a convertir (o cita un mensaje).\n\n` +
        `📌 ${P}tts Hola cómo estás\n📌 ${P}tts lupe Hola cómo estás\n📌 ${P}tts en Hello world\n\n` +
        `_Usa ${P}voces para ver las voces e idiomas._`
      )
    }

    try {
      const { buffer, etiqueta } = await tts.generar(texto, seleccion)
      await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg })
      return etiqueta
    } catch (error) {
      console.error('[TTS]', error)
      return responder(`❌ No se pudo generar el audio.\n\n> ${error.message || 'Error desconocido'}`)
    }
  },
}
