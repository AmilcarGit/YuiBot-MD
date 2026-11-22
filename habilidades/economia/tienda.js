// Código Oficial de YuiBot-MD.by AmilcarGit
import { tienda } from '../../nucleo/juego.js'
import { formato } from '../../nucleo/utiles.js'

export default {
  nombre: 'tienda',
  alias: ['shop'],
  categoria: 'economia',
  ayuda: 'Compra mejoras permanentes',
  registro: true,
  async ejecutar(sock, m, ctx) {
    const u = ctx.usuario
    const [accion, id] = ctx.args

    if (accion?.toLowerCase() === 'comprar') {
      const objeto = tienda.find(t => t.id === id?.toLowerCase())
      if (!objeto) return ctx.responder('Ese objeto no existe.')
      if (u.inventario[objeto.id]) return ctx.responder('Ya tienes ese objeto.')
      if (u.monedas < objeto.precio) return ctx.responder('No tienes monedas suficientes.')
      u.monedas -= objeto.precio
      u.inventario[objeto.id] = 1
      return ctx.responder(`Compraste ${objeto.nombre}.`)
    }

    await ctx.responder([
      '*Tienda*',
      ...tienda.map(t => `• ${t.id} — ${t.nombre} (${formato(t.precio)}): ${t.efecto}`),
      `Uso: ${ctx.prefijo}tienda comprar <id>`
    ].join('\n'))
  }
}
