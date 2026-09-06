//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'block',
  description: 'Bloquea un usuario de WhatsApp',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const citado = msg.message?.extendedTextMessage?.contextInfo
    const mencionado = citado?.mentionedJid?.[0]
    const numero = args.join('').replace(/[^0-9]/g, '')
    const objetivo = mencionado || (numero ? `${numero}@s.whatsapp.net` : null)

    if (!objetivo) {
      return sock.sendMessage(jid, { text: '🚫 Usa: *block número* o responde/menciona al usuario.' }, { quoted: msg })
    }

    if (objetivo === jid && jid.endsWith('@s.whatsapp.net')) {
      return sock.sendMessage(jid, { text: '❌ No puedes bloquear este chat desde el mismo chat.' }, { quoted: msg })
    }

    try {
      await sock.updateBlockStatus(objetivo, 'block')
      await sock.sendMessage(jid, { text: `🚫 Usuario bloqueado: *${objetivo.split('@')[0]}*` }, { quoted: msg })
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ No se pudo bloquear al usuario.\n${error.message || 'Error desconocido'}` }, { quoted: msg })
    }
  },
}
