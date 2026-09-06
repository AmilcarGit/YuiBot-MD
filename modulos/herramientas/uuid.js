//CÓDIGO ORIGINAL DE YUIBOT-MD
const crypto = require('crypto')

module.exports = {
  name: 'uuid',
  description: 'Genera un identificador UUID v4',
  category: 'herramientas',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const id = crypto.randomUUID()
    await sock.sendMessage(jid, { text: `╭─ ✦ 🧩 UUID ✦
│ 🔑 UUID v4:
│ *${id}*
╰─ 🍃 YuiBot-MD` }, { quoted: msg })
  },
}
