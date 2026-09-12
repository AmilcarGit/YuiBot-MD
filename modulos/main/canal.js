//CÓDIGO ORIGINAL DE YUIBOT-MD
const { enviarBotones } = require('../../lib/whatsapp/interactivos')

module.exports = {
  name: 'canal',
  aliases: ['gruposoficiales', 'canaloficial'],
  description: 'Comparte el canal oficial de WhatsApp del bot',
  category: 'main',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const nl = config.NEWSLETTER || {}

    if (!nl.ENABLED || !nl.URL) {
      const texto = args[0]?.toLowerCase() === 'setup'
        ? '⚙️ Para activarlo: edita NEWSLETTER en defaults.js con ENABLED: true y tu URL real (WhatsApp > tu canal > ⋮ > Compartir > Copiar enlace).'
        : 'ℹ️ Todavía no hay un canal oficial configurado.'
      return sock.sendMessage(jid, { text: texto }, { quoted: msg })
    }

    await enviarBotones(sock, jid, {
      text: `📢 *${nl.NOMBRE || 'Nuestro canal oficial'}*\n\nEntérate de novedades, avisos y actualizaciones del bot directo desde ahí 🌸`,
      footer: config.BOT_NAME,
      buttons: [{ text: '📢 Abrir canal', url: nl.URL }],
    })
  },
}