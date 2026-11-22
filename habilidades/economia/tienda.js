// Código Oficial de YuiBot-MD.by AmilcarGit
import { tienda } from '../../nucleo/juego.js'
import { formato } from '../../nucleo/utiles.js'
import { caja, dice, mal, ok, temaActivo } from '../../estilo/index.js'

export default {
  nombre: 'tienda',
  alias: ['shop'],
  categoria: 'economia',
  ayuda: 'Compra mejoras permanentes',
  registro: true,
  async ejecutar(sock, m, ctx) {
    const u = ctx.usuario
    const e = temaActivo().emojis
    const [accion, id] = ctx.args

    if (accion?.toLowerCase() === 'comprar') {
      const objeto = tienda.find(t => t.id === id?.toLowerCase())
      if (!objeto) return ctx.responder(mal(dice('tiendaNoExiste')))
      if (u.inventario[objeto.id]) return ctx.responder(mal(dice('tiendaTienes')))
      if (u.monedas < objeto.precio) return ctx.responder(mal(dice('tiendaPobre')))
      u.monedas -= objeto.precio
      u.inventario[objeto.id] = 1
      return ctx.responder(ok(dice('tiendaCompra', { objeto: objeto.nombre })))
    }

    await ctx.responder(caja('Tienda', [
      dice('tiendaLista'),
      '',
      ...tienda.flatMap(t => [`${e.regalo} ${t.nombre} · ${e.dinero} ${formato(t.precio)}`, `   ${t.efecto} (${t.id})`]),
      '',
      `Uso: ${ctx.prefijo}tienda comprar id`
    ]))
  }
}
