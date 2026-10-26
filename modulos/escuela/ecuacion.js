// .ecuacion — resuelve ecuaciones de 1.er y 2.º grado.
const { caja } = require('../../lib/estilo')
const { resolverEcuacion } = require('../../lib/escuelaMate')

module.exports = {
  name: 'ecuacion',
  aliases: ['ecuacion2', 'cuadratica'],
  description: 'Resuelve ax²+bx+c=0: ecuacion 1 -5 6 (a b c)',
  category: 'escuela',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const nums = args.map((a) => Number(String(a).replace(',', '.')))
    if (args.length < 2 || args.length > 3 || nums.some((n) => !Number.isFinite(n))) {
      return sock.sendMessage(jid, { text: `❌ Escribe los coeficientes.\n\n📌 Ejemplos:\n${P}ecuacion 1 -5 6  → x² − 5x + 6 = 0\n${P}ecuacion 2 -8  → 2x − 8 = 0 (primer grado: b c)` }, { quoted: msg })
    }
    const [a, b, c] = args.length === 2 ? [0, nums[0], nums[1]] : nums
    const r = resolverEcuacion(a, b, c)
    const titulo = a === 0 ? `${b}x ${c < 0 ? '−' : '+'} ${Math.abs(c)} = 0` : `${a}x² ${b < 0 ? '−' : '+'} ${Math.abs(b)}x ${c < 0 ? '−' : '+'} ${Math.abs(c)} = 0`
    const filas = [['Ecuación', titulo, '📐']]
    if (r.discriminante !== undefined) filas.push(['Discriminante', r.discriminante, 'Δ'])
    const textos = {
      'sin-solucion': 'No tiene solución.',
      infinitas: 'Tiene infinitas soluciones.',
    }
    if (textos[r.tipo]) filas.push(textos[r.tipo])
    else if (r.tipo === 'doble') filas.push(['x', `${r.raices[0]} (raíz doble)`, '✅'])
    else if (r.tipo === 'complejas') r.raices.forEach((x, i) => filas.push([`x${i + 1}`, x, '🌀']))
    else r.raices.forEach((x, i) => filas.push([r.raices.length === 1 ? 'x' : `x${i + 1}`, x, '✅']))
    return sock.sendMessage(jid, { text: caja('📐', 'Ecuación', filas, r.tipo === 'complejas' ? 'Soluciones complejas (Δ < 0)' : 'Resuelto con la fórmula general') }, { quoted: msg })
  },
}
