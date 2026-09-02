//CÓDIGO ORIGINAL DE YUIBOT-MD
const { obtenerItem } = require('../../lib/tienda')
const { equiparItem } = require('../../lib/db')

module.exports = {
  name: 'equipar',
  aliases: ['equip'],
  description: 'Equipa una insignia, color o título que ya compraste',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numero = remitente.split('@')[0].split(':')[0]

    const id = parseInt(args[0], 10)
    const item = obtenerItem(id)

    if (!item || !['insignia', 'color', 'titulo'].includes(item.tipo)) {
      return sock.sendMessage(
        jid,
        { text: `❌ Ese número no corresponde a una insignia, color o título.\n📌 Usa ${prefijo}inventario para ver lo que tienes.` },
        { quoted: msg }
      )
    }

    const resultado = equiparItem(numero, item)

    if (!resultado.exito) {
      return sock.sendMessage(
        jid,
        { text: `❌ No tienes *${item.nombre}*. Cómpralo primero con ${prefijo}comprar ${item.id}.` },
        { quoted: msg }
      )
    }

    await sock.sendMessage(jid, { text: `✅ *${item.nombre}* equipado. Se verá en tu ${prefijo}perfil.` }, { quoted: msg })
  },
}