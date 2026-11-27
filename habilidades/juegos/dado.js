// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { aleatorio } from '../../nucleo/utiles.js'

export default {
  nombre: 'dado',
  alias: ['dice', 'd6', 'tirar'],
  categoria: 'juegos',
  ayuda: 'Tira un dado: .dado (6 caras) · .dado 20 · .dado 3d6 (tres dados)',
  async ejecutar(sock, m, ctx) {
    const t = (ctx.args[0] || '6').toLowerCase().replace(/^d/, '1d')
    const partes = t.includes('d') ? t.split('d') : ['1', t]
    const cuantos = Number(partes[0] || 1); const caras = Number(partes[1])
    if (!Number.isInteger(cuantos) || !Number.isInteger(caras) || cuantos < 1 || cuantos > 10 || caras < 2 || caras > 1000) return ctx.responder(mal(`Uso: ${ctx.prefijo}dado · ${ctx.prefijo}dado 20 · ${ctx.prefijo}dado 3d6 (hasta 10 dados de 2 a 1000 caras)`))
    const tiros = Array.from({ length: cuantos }, () => aleatorio(1, caras))
    await ctx.responder(caja('Dado', [`🎲 ${cuantos}d${caras}`, `✨ ${tiros.join(' · ')}`, cuantos > 1 && `➕ Total: *${tiros.reduce((a, b) => a + b, 0)}*`]))
  }
}
