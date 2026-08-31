module.exports = {
  name: 'menu',
  aliases: ['ayuda', 'help'],
  description: 'Muestra la lista de comandos disponibles',

  /**
   * @param {import('@whiskeysockets/baileys').WASocket} sock
   * @param {import('@whiskeysockets/baileys').proto.IWebMessageInfo} msg
   * @param {string[]} args
   * @param {Map} allCommands
   */
  async execute(sock, msg, args, allCommands) {
    const jid = msg.key.remoteJid;

    // Evitar duplicados (por los alias apuntando al mismo comando)
    const uniqueCommands = [...new Set(allCommands.values())];

    let text = '🤖 *MENÚ DEL BOT*\n\n';
    for (const cmd of uniqueCommands) {
      text += `▪️ *!${cmd.name}* — ${cmd.description}\n`;
    }
    text += '\n_Escribe !comando para usarlo._';

    await sock.sendMessage(jid, { text });
  },
};
