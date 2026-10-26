const { caja, uso } = require('../../lib/estilo')

const RESPUESTAS = [
  '🟢 Sí, definitivamente.', '🟢 Sin duda alguna.', '🟢 Todo apunta a que sí.', '🟢 Puedes contar con ello.', '🟢 Es muy probable.',
  '🟡 Pregúntame de nuevo más tarde.', '🟡 No puedo predecirlo ahora.', '🟡 Concéntrate y vuelve a preguntar.', '🟡 Mejor no te lo digo ahora.',
  '🔴 No lo creo.', '🔴 Mi respuesta es no.', '🔴 Las señales dicen que no.', '🔴 Muy dudoso.', '🔴 Ni lo sueñes.',
]

module.exports = {
  name: 'bola8',
  aliases: ['8ball', 'bolamagica'],
  description: 'La bola mágica responde tu pregunta: .bola8 ¿Aprobaré?',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const pregunta = args.join(' ').trim()
    if (!pregunta) {
      return sock.sendMessage(jid, { text: uso(config.PREFIXES[0], 'bola8', '¿Me irá bien hoy?', 'Hazme una pregunta.') }, { quoted: msg })
    }
    const respuesta = RESPUESTAS[Math.floor(Math.random() * RESPUESTAS.length)]
    await sock.sendMessage(jid, { text: caja('🎱', 'Bola mágica', [['Pregunta', pregunta], ['Respuesta', respuesta]], 'Las bolas mágicas nunca mienten ✨') }, { quoted: msg })
  },

  _internos: { RESPUESTAS },
}
