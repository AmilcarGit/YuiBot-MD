//CÓDIGO ORIGINAL DE YUIBOT-MD
const util = require('util')

module.exports = {
  name: 'eval',
  description: 'Ejecuta JavaScript interno como owner',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { esSubBot } = {}) {
    const jid = msg.key.remoteJid

    // Defensa en profundidad: ejecución de código arbitrario solo desde el
    // bot principal, nunca dentro de un subbot (aunque quien lo pida sea owner).
    if (esSubBot) {
      return sock.sendMessage(jid, { text: '⛔ eval solo está disponible en el bot principal.' }, { quoted: msg })
    }

    const codigo = args.join(' ').trim()
    if (!codigo) {
      return sock.sendMessage(jid, { text: '🧪 Usa: *eval código*' }, { quoted: msg })
    }

    try {
      const resultado = await eval(`(async () => { ${codigo} })()`)
      const salida = typeof resultado === 'string' ? resultado : util.inspect(resultado, { depth: 4, maxArrayLength: 50 })
      await sock.sendMessage(jid, { text: `🧪 *EVAL*\n\n\`\`\`\n${salida.slice(0, 12000)}\n\`\`\`` }, { quoted: msg })
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ *EVAL ERROR*\n\n\`\`\`\n${(error.stack || error.message || String(error)).slice(0, 12000)}\n\`\`\`` }, { quoted: msg })
    }
  },
}
