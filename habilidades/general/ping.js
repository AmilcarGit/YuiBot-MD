// Código Oficial de YuiBot-MD.by AmilcarGit
import { dice, ok } from '../../estilo/index.js'

export default {
  nombre: 'ping',
  alias: ['p'],
  categoria: 'general',
  ayuda: 'Velocidad de respuesta',
  async ejecutar(sock, m, ctx) {
    const marca = Number(m.messageTimestamp?.toNumber?.() ?? m.messageTimestamp)
    const ms = Number.isFinite(marca) ? Math.max(0, Date.now() - marca * 1000) : 0
    await ctx.responder(ok(dice('pingOk', { ms })))
  }
}
