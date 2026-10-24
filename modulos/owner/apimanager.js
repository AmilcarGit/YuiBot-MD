//CÓDIGO ORIGINAL DE YUIBOT-MD
const apiManager = require('../../lib/apiManager')

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

    let texto = '🔌 *Proveedores de API*\n\n'
    for (const nombre of nombres) {
      const info = proveedores[nombre]
      const tieneKey = info.apiKey ? '🔑' : '⚠️ sin key'
      texto += `${info.enabled !== false ? '✅' : '⛔'} *${nombre}* ${tieneKey}\n`
    }
    texto += '\nUsa *apimanager on/off <proveedor>* para habilitar o deshabilitar uno.'

    return sock.sendMessage(jid, { text: texto }, { quoted: msg })
  },
}