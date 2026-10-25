const RESPUESTAS = [
  '🟢 Sí, definitivamente.', '🟢 Sin duda alguna.', '🟢 Todo apunta a que sí.', '🟢 Puedes contar con ello.', '🟢 Es muy probable.',
  '🟡 Pregúntame de nuevo más tarde.', '🟡 No puedo predecirlo ahora.', '🟡 Concéntrate y vuelve a preguntar.', '🟡 Mejor no te lo digo ahora.',
  '🔴 No lo creo.', '🔴 Mi respuesta es no.', '🔴 Las señales dicen que no.', '🔴 Muy dudoso.', '🔴 Ni lo sueñes.',
]

module.exports = {
  name: 'bola8',
  aliases: ['8ball', 'bola', 'pregunta8'],
  description: 'La bola mágica responde tu pregunta: .bola8 ¿Aprobaré?',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const pregunta = args.join(' ').trim()
    if (!pregunta) {
      return sock.sendMessage(jid, { text: `❌ Hazme una pregunta.\n\n📌 Ejemplo: ${config.PREFIXES[0]}bola8 ¿Me irá bien hoy?` }, { quoted: msg })
    }
    const respuesta = RESPUESTAS[Math.floor(Math.random() * RESPUESTAS.length)]
    await sock.sendMessage(jid, { text: `🎱 *Bola mágica*\n\n❓ ${pregunta}\n\n${respuesta}` }, { quoted: msg })
  },

  _internos: { RESPUESTAS },
}
