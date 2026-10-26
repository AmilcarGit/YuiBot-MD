const { esAdmin, limpiar } = require('../../lib/adminGrupo')
const { caja } = require('../../lib/estilo')

module.exports = {
  name: 'admins',
  aliases: ['listaadmins', 'staff'],
  description: 'Lista y menciona a los administradores del grupo',
  category: 'grupo',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid
    if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ Este comando solo funciona en grupos.' }, { quoted: msg })
    let metadata
    try { metadata = await sock.groupMetadata(jid) } catch {
      return sock.sendMessage(jid, { text: '❌ No se pudo obtener la información del grupo.' }, { quoted: msg })
    }
    const lista = metadata.participants.filter(esAdmin)
    const filas = lista.map((p) => `${p.admin === 'superadmin' ? '👑' : '🛡️'} @${limpiar(p.id)}`)
    return sock.sendMessage(jid, { text: caja('🛡️', 'Staff del grupo', [`✦ Admins (${lista.length})`, ...filas], 'Administradores activos'), mentions: lista.map((p) => p.id) }, { quoted: msg })
  },
}
