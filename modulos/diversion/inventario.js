//CÓDIGO ORIGINAL DE YUIBOT-MD
const { caja } = require('../../lib/estilo')
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
        { text: caja('📦', 'Tu inventario', ['Todavía no tienes objetos.'], `Usa ${prefijo}tienda para ver qué puedes comprar`) },
        { quoted: msg }
      )
    }

    const filas = []

    for (const id of inventario) {
      const item = CATALOGO.find((i) => i.id === id)
      if (!item) continue

      let equipado = ''
      if (item.tipo === 'insignia' && datos.insigniaEquipada === id) equipado = ' ✅ equipado'
      if (item.tipo === 'color' && datos.colorEquipado === id) equipado = ' ✅ equipado'
      if (item.tipo === 'titulo' && datos.tituloEquipado === id) equipado = ' ✅ equipado'

      filas.push(`✦ *${item.nombre}*${equipado}`)
    }

    const texto = caja('🎒', 'Tu inventario', filas, `Usa ${prefijo}equipar <número> para cambiar`)

    await sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}