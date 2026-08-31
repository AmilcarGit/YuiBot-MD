//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'owner',
  aliases: [],
  description: 'Muestra información de contacto del owner',
  category: 'main',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid;
    const text = `👑 Owner de ${config.BOT_NAME}\n` + config.OWNERS.map((o) => `wa.me/${o}`).join('\n');
    await sock.sendMessage(jid, { text });
  },
};