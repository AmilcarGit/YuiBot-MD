// .unidades — conversor de unidades de longitud, masa, tiempo, volumen, área, datos y temperatura.
const { caja } = require('../../lib/estilo')
const { convertirUnidad, listaUnidades } = require('../../lib/escuelaMate')

const redondear = (n) => (Math.abs(n) >= 1e9 || (Math.abs(n) < 1e-4 && n !== 0) ? n.toExponential(4) : Number(n.toFixed(6)))

module.exports = {
  name: 'unidades',
  aliases: ['conv', 'convunidad'],
  description: 'Convierte unidades: unidades 5 km m · unidades 30 c f',
  category: 'escuela',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    if (!args.length || args[0].toLowerCase() === 'lista') {
      const filas = listaUnidades().map(([nombre, u]) => `*${nombre}:* ${u.join(', ')}`)
      return sock.sendMessage(jid, { text: caja('📏', 'Unidades', filas, `Ejemplo: ${P}unidades 5 km m`) }, { quoted: msg })
    }
    // Admite "5 km m", "5km m" y "5 km a m"
    const unido = args.join(' ').replace(/^(-?\d+(?:[.,]\d+)?)([a-zA-Z°].*)$/, '$1 $2')
    const partes = unido.split(/\s+/).filter((p) => !['a', 'en', 'to'].includes(p.toLowerCase()))
    const valor = Number(String(partes[0]).replace(',', '.'))
    if (partes.length !== 3 || !Number.isFinite(valor)) {
      return sock.sendMessage(jid, { text: `❌ Formato: ${P}unidades <valor> <de> <a>\n\n📌 Ejemplos:\n${P}unidades 5 km m\n${P}unidades 30 c f\n${P}unidades lista` }, { quoted: msg })
    }
    try {
      const r = convertirUnidad(valor, partes[1], partes[2])
      return sock.sendMessage(jid, { text: caja('📏', 'Conversión', [['Valor', `${valor} ${r.desde}`, '📥'], ['Resultado', `${redondear(r.resultado)} ${r.hasta}`, '📤']]) }, { quoted: msg })
    } catch (error) {
      return sock.sendMessage(jid, { text: `❌ ${error.message}\n\nUsa ${P}unidades lista para ver las disponibles.` }, { quoted: msg })
    }
  },
}
