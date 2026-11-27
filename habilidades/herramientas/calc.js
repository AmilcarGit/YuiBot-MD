// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { calcular } from '../../nucleo/herramientas.js'

export default {
  nombre: 'calc',
  alias: ['calcular', 'calculadora', 'cuenta'],
  categoria: 'herramientas',
  ayuda: 'Calculadora: .calc 12*(3+4) · .calc 20% de 150 · .calc raiz(81)',
  async ejecutar(sock, m, ctx) {
    const operacion = ctx.args.join(' ').trim()
    if (!operacion) return ctx.responder(mal(`Escribe la operación: ${ctx.prefijo}calc 12*(3+4)\nTambién: %, ^, raiz(), sin(), pi`))
    try {
      const r = calcular(operacion)
      await ctx.responder(caja('Calculadora', [`🧮 ${operacion.slice(0, 60)}`, `✅ = *${r.toLocaleString('es-PE', { maximumFractionDigits: 10 })}*`]))
    } catch (error) { await ctx.responder(mal(error.message)) }
  }
}
