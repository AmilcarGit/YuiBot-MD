// .tema — cambia el aspecto de TODOS los comandos (cajas, viñetas, menú). Solo owners.
const tema = require('../../lib/tema')
const { caja } = require('../../lib/estilo')

module.exports = {
  name: 'tema',
  aliases: ['navidad', 'theme'],
  description: 'Tema visual del bot: .tema auto|normal|navidad',
  category: 'owner',
  ownerOnly: true,

  async execute(sock, msg, args, { config } = {}) {
    const jid = msg.key.remoteJid
    const P = config?.PREFIXES?.[0] || '.'
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
    const pedido = String(args[0] || '').toLowerCase()

    if (!pedido) {
      const modo = tema.modo()
      return responder(caja('🎨', 'Tema', [
        ['Modo', modo === 'auto' ? 'automático (Navidad del 1 dic al 6 ene)' : modo, '⚙️'],
        ['Ahora se ve', tema.actual().nombre, '👁️'],
        null,
        `${P}tema navidad  → siempre Navidad`,
        `${P}tema normal   → el diseño de siempre`,
        `${P}tema auto     → cambia solo según la fecha`,
      ]))
    }
    try {
      const modo = tema.fijarModo(pedido)
      return responder(`${modo === 'navidad' ? '🎄' : '✅'} Tema: *${modo}*. Se aplica desde la próxima respuesta.\n\n${caja('👀', 'Así se ve', [['Ejemplo', 'todas las cajas'], ['Otra fila', 'con viñetas del tema']])}`)
    } catch (e) {
      return responder(`❌ ${e.message}`)
    }
  },
}
