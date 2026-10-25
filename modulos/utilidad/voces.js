const { VOCES, IDIOMAS } = require('../../lib/tts')

module.exports = {
  name: 'voces',
  aliases: ['ttsvoices', 'idiomastts'],
  description: 'Muestra las voces e idiomas disponibles para el comando tts',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const P = config.PREFIXES[0]
    const grupo = (lang) => Object.entries(VOCES)
      .filter(([, v]) => v.lang === lang)
      .map(([clave, v]) => `${v.pais} ${clave} ${v.genero === 'mujer' ? '👩' : '👨'}`)
      .join('\n')
    const idiomas = Object.entries(IDIOMAS).map(([c, n]) => `${c} (${n})`).join(', ')
    const texto =
      `🔊 *Voces disponibles*\n\n` +
      `🗣️ *Español*\n${grupo('es')}\n\n` +
      `🗣️ *Inglés*\n${grupo('en')}\n\n` +
      `🌍 *Idiomas:* ${idiomas}\n\n` +
      `📌 ${P}tts <voz o idioma> <texto>`
    await sock.sendMessage(msg.key.remoteJid, { text: texto }, { quoted: msg })
  },
}
