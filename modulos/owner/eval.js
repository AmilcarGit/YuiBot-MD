//CÓDIGO ORIGINAL DE YUIBOT-MD
const util = require('util')

module.exports = {
  name: 'eval',
  description: 'Ejecuta JavaScript interno como owner',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
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
