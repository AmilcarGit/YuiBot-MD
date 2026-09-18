//CÓDIGO ORIGINAL DE YUIBOT-MD
const estadisticas = require('../../lib/estadisticas')

module.exports = {
  name: 'dashboard',
  description: 'Muestra estadísticas de uso del bot (mensajes y comandos más usados)',
  category: 'sistema',
  ownerOnly: true,

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const resumen = estadisticas.obtenerResumen()

    const desde = new Date(resumen.desde)
    const dias = Math.max(1, Math.ceil((Date.now() - desde.getTime()) / 86400000))

    const topTexto = resumen.topComandos.length
      ? resumen.topComandos.map(([nombre, cantidad], i) => `${i + 1}. ${nombre} — ${cantidad}`).join('\n')
      : 'Todavía no hay comandos registrados.'

    const texto = [
      '📊 *DASHBOARD*',
      '',
      `Desde: *${desde.toLocaleDateString('es-PE')}* (${dias} día(s))`,
      `Mensajes procesados: *${resumen.mensajesTotales}*`,
      `Comandos ejecutados: *${resumen.comandosTotales}*`,
      '',
      '🏆 *Top comandos:*',
      topTexto,
    ].join('\n')

    return sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}