// .red — estado de todos los procesos (principal y subbots) por latido.
const { listarHeartbeats } = require('../../lib/red')
const { describirDuracion } = require('../../lib/fechas')
const { caja } = require('../../lib/estilo')

module.exports = {
  name: 'red',
  aliases: ['estadored', 'latidos'],
  description: 'Muestra qué bots (principal y subbots) están vivos',
  category: 'subbot',
  ownerOnly: true,

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    const lista = listarHeartbeats()
    if (!lista.length) return sock.sendMessage(jid, { text: '📭 No hay latidos registrados todavía.' }, { quoted: msg })
    const filas = lista.map((h) => `${h.vivo ? '🟢' : '🔴'} ${h.id === 'PRINCIPAL' ? 'Principal' : `+${h.id}`} — último latido hace ${describirDuracion(h.edadMs)}`)
    const vivos = lista.filter((h) => h.vivo).length
    return sock.sendMessage(jid, { text: caja('📡', 'Red de bots', filas, `${vivos}/${lista.length} activos`) }, { quoted: msg })
  },
}
