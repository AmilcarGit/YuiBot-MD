//CÓDIGO ORIGINAL DE YUIBOT-MD
const apiManager = require('../../lib/apiManager')
const { caja } = require('../../lib/estilo')

module.exports = {
  name: 'apimanager',
  aliases: ['apis', 'apiestado'],
  description: 'Ver o habilitar/deshabilitar proveedores de API externas',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid
    const sub = (args[0] || '').toLowerCase()
    const proveedor = args[1]

    if ((sub === 'on' || sub === 'off') && proveedor) {
      const actualizado = sub === 'on' ? apiManager.habilitar(proveedor) : apiManager.deshabilitar(proveedor)
      return sock.sendMessage(
        jid,
        { text: `✅ Proveedor *${proveedor}* → ${actualizado.enabled ? 'habilitado' : 'deshabilitado'}.` },
        { quoted: msg },
      )
    }

    const proveedores = apiManager.listar()
    const nombres = Object.keys(proveedores)

    if (!nombres.length) {
      return sock.sendMessage(jid, { text: 'ℹ️ No hay proveedores registrados todavía.' }, { quoted: msg })
    }

    const filas = nombres.map((nombre) => {
      const info = proveedores[nombre]
      const tieneKey = info.apiKey ? '🔑' : '⚠️ sin key'
      return [nombre, `${info.enabled !== false ? '🟢' : '🔴'} ${tieneKey}`]
    })
    const texto = caja('🔌', 'Proveedores de API', filas, 'Usa apimanager on/off <proveedor> para habilitar o deshabilitar uno.')

    return sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}