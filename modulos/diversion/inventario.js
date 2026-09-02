//CÓDIGO ORIGINAL DE YUIBOT-MD
const { obtenerUsuario } = require('../../lib/db')
const { CATALOGO } = require('../../lib/tienda')

module.exports = {
  name: 'inventario',
  aliases: ['inv', 'items'],
  description: 'Muestra los objetos que has comprado',
  category: 'diversion',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const prefijo = config.PREFIXES[0]
    const remitente = msg.key.participantAlt || msg.key.participant || jid
    const numero = remitente.split('@')[0].split(':')[0]

    const datos = obtenerUsuario(numero)
    const inventario = datos?.inventario || []

    if (!inventario.length) {
      return sock.sendMessage(
        jid,
        { text: `📦 Todavía no tienes objetos.\n📌 Usa ${prefijo}tienda para ver qué puedes comprar.` },
        { quoted: msg }
      )
    }

    let texto = `📦 *TU INVENTARIO*\n\n`

    for (const id of inventario) {
      const item = CATALOGO.find((i) => i.id === id)
      if (!item) continue

      let equipado = ''
      if (item.tipo === 'insignia' && datos.insigniaEquipada === id) equipado = ' ✅ equipado'
      if (item.tipo === 'color' && datos.colorEquipado === id) equipado = ' ✅ equipado'
      if (item.tipo === 'titulo' && datos.tituloEquipado === id) equipado = ' ✅ equipado'

      texto += `❯ *${item.nombre}*${equipado}\n`
    }

    texto += `\n╰─➤ _Usa ${prefijo}equipar <número> para cambiar_`

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}