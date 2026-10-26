//CÓDIGO ORIGINAL DE YUIBOT-MD
const { caja } = require('../../lib/estilo')

module.exports = {
  name: 'owner',
  aliases: [],
  description: 'Muestra información del owner',
  category: 'main',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid;

    const filas = []
    config.OWNERS.forEach((o, i) => {
      if (i > 0) filas.push('┃')
      filas.push(['Nombre', o.nombre], ['Rango', o.rango], ['Contacto', `wa.me/${o.numero}`])
    })
    const text = caja('👑', 'Owner', filas, config.BOT_NAME);

    await sock.sendMessage(jid, { text: text.trim() });
  },
};