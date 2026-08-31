//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'owner',
  aliases: [],
  description: 'Muestra información del owner',
  category: 'main',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid;

    let text = `⛧───「 ${config.BOT_NAME} 」───⛧\n\n`;
    for (const o of config.OWNERS) {
      text += `  ❖ nombre: ${o.nombre}\n  ❖ rango: ${o.rango}\n  ❖ contacto: wa.me/${o.numero}\n\n`;
    }
    text += `╰─➤ _${config.BOT_NAME}_ 🥀`;

    await sock.sendMessage(jid, { text: text.trim() });
  },
};