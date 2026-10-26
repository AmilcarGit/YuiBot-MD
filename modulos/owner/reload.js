//CÓDIGO ORIGINAL DE YUIBOT-MD
const { caja } = require('../../lib/estilo')

module.exports = {
  name: 'reload',
  aliases: [],
  description: 'Recarga todos los módulos sin reiniciar el bot',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { config, commands, categories }) {
    const jid = msg.key.remoteJid
    const { loadCommands } = require('../../lib/cargador')
    loadCommands(commands, categories)
    await sock.sendMessage(jid, { text: caja('♻️', 'Módulos recargados', [['Bot', config.BOT_NAME], ['Estado', '🟢 Listo']], 'Sin reiniciar el bot') })
  },
}