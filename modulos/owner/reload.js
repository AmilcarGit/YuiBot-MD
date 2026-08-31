//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'reload',
  aliases: [],
  description: 'Recarga todos los módulos sin reiniciar el bot',
  category: 'main',
  ownerOnly: true,

  async execute(sock, msg, args, { config, commands, categories }) {
    const jid = msg.key.remoteJid;
    const { loadCommands } = require('../../lib/cargador');
    loadCommands(commands, categories);
    await sock.sendMessage(jid, { text: `♻️ Módulos de ${config.BOT_NAME} recargados.` });
  },
};