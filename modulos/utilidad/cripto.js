const E = require('../../lib/estilo')
const publicas = require('../../lib/publicas')

module.exports = {
  name: 'cripto',
  aliases: ['crypto'],
  description: 'Precio de una criptomoneda: .cripto btc',
  category: 'utilidad',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const consulta = (args[0] || 'btc').toLowerCase()

    try {
      const c = await publicas.cripto(consulta)
      const cambio = c.cambio24h
      const flecha = typeof cambio === 'number' ? (cambio >= 0 ? '📈' : '📉') : '➖'
      await sock.sendMessage(jid, {
        text: E.caja('🪙', c.id, [
          ['USD', `$${c.usd.toLocaleString('en-US', { maximumFractionDigits: 6 })}`, '💵'],
          typeof c.pen === 'number' ? ['PEN', `S/ ${c.pen.toLocaleString('es-PE', { maximumFractionDigits: 4 })}`, '🇵🇪'] : null,
          typeof cambio === 'number' ? ['24 h', `${cambio.toFixed(2)}%`, flecha] : null,
        ], 'Datos de CoinGecko'),
      }, { quoted: msg })
    } catch (error) {
      const texto = error.noEncontrado
        ? `❌ No encontré "${consulta}".\n\n📌 Prueba: ${config.PREFIXES[0]}cripto btc, eth, sol, doge, bnb, xrp…`
        : `❌ No se pudo consultar el precio.\n\n> ${error.message}`
      await sock.sendMessage(jid, { text: texto }, { quoted: msg })
    }
  },
}
