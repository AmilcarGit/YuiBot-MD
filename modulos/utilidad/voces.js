//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'voces',
  aliases: ['ttsvoices'],
  description: 'Muestra las voces disponibles para el comando tts',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]

    const texto =
      `⛧───「 Voces disponibles 」───⛧\n\n` +
      `🇪🇸 *Castellano:* jorge, carmen, juan, leonor, monica, duardo, lola, manuel, juanito, florita\n\n` +
      `🇲🇽 *Mexicana:* esperanza, javier, paulina, francisco, gloria, violeta, miguelito, paquita, mia\n\n` +
      `🇦🇷 *Argentina:* diego\n\n` +
      `🇨🇱 *Chilena:* francisca\n\n` +
      `🌎 *Latina:* carlos, soledad, ximena, miguel, penelope, lupe\n\n` +
      `🇪🇸 *España (Polly):* conchita, enrique, lucia\n\n` +
      `🇺🇸 *Inglés US:* joanna, matthew\n\n` +
      `🇬🇧 *Inglés UK:* amy, brian\n\n` +
      `╰─➤ _Uso: ${prefijo}tts <voz> <texto>_ 🥀`

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}