//CÓDIGO ORIGINAL DE YUIBOT-MD
const E = require('../../lib/estilo')
module.exports = {
  name: 'hora',
  aliases: [],
  description: 'Muestra la hora y fecha actual',
  category: 'utilidad',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const ahora = new Date()
    const hora = ahora.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'America/Lima' })
    const fecha = ahora.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Lima' })
    await sock.sendMessage(jid, { text: E.caja('⏰', 'Hora', [['Fecha', fecha, '📅'], ['Hora', hora, '🕐'], ['Zona', 'America/Lima (UTC-5)', '🌎']], 'YuiBot-MD') }, { quoted: msg })
  },
}