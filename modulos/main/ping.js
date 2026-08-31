//CÓDIGO ORIGINAL DE YUIBOT-MD
module.exports = {
  name: 'ping',
  aliases: ['p'],
  description: 'Muestra la velocidad de respuesta del bot',
  category: 'main',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const start = Date.now();
    const sent = await sock.sendMessage(jid, { text: '🏓 Calculando...' });
    const latency = Date.now() - start;

    await sock.sendMessage(jid, {
      text: `🏓 Pong! ${latency}ms`,
      edit: sent.key,
    });
  },
};