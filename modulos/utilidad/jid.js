//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'jid',
  aliases: [],
  description: 'Obtiene el JID del usuario o grupo',
  category: 'utilidad',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const objetivo = mencionado || msg.key.participantAlt || msg.key.participant || jid
    await sock.sendMessage(jid, { text: `╭─ ✦ 🆔 JID ✦\n│ 📌 JID: *${objetivo}*\n│ 📱 Número: *${objetivo.split('@')[0].split(':')[0]}*\n│ 💬 Tipo: *${objetivo.endsWith('@g.us') ? 'Grupo' : 'Usuario'}*\n╰─ 🍃 YuiBot-MD` }, { quoted: msg })
  },
}