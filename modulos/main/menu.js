//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'menu',
  aliases: ['ayuda', 'help'],
  description: 'Muestra la lista de comandos disponibles',
  category: 'main',

  async execute(sock, msg, args, { categories, config }) {
    const jid = msg.key.remoteJid;

    let text = `⛧───「 ${config.BOT_NAME} 」───⛧\n\n`;
    for (const [category, cmds] of categories) {
      text += `📂 ${category.toUpperCase()}\n`;
      const unique = [...new Set(cmds)];
      for (const cmd of unique) {
        text += `  ❖ ${cmd.name}     → ${cmd.description}\n`;
      }
      text += '\n';
    }
    text += `╰─➤ _Prefijos: ${config.PREFIXES.join(' ')}${config.ALLOW_NO_PREFIX ? ' (o sin prefijo)' : ''}_ 🥀`;

    await sock.sendMessage(jid, { text: text.trim() });
  },
};