//CÓDIGO ORIGINAL DE YUIBOT-MD
const E = require('../../lib/estilo')
module.exports = {
  name: 'jid',
  aliases: [],
  description: 'Obtiene el JID del usuario o grupo',
  category: 'utilidad',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const mencionado = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const objetivo = mencionado || msg.key.participantAlt || msg.key.participant || jid
    await sock.sendMessage(jid, { text: E.caja('🆔', 'JID', [['JID', objetivo, '📌'], ['Número', objetivo.split('@')[0].split(':')[0], '📱'], ['Tipo', objetivo.endsWith('@g.us') ? 'Grupo' : 'Usuario', '💬']], 'YuiBot-MD') }, { quoted: msg })
  },
}