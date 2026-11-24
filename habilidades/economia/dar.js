// Código Oficial de YuiBot-MD.by AmilcarGit
import { formato } from '../../nucleo/utiles.js'
import { mal, ok } from '../../estilo/index.js'

export const MAX_REGALO = 100000

export default {
  nombre: 'dar',
  alias: ['regalar', 'pagar'],
  categoria: 'economia',
  ayuda: 'Regala monedas a otro jugador: dar número cantidad',
  registro: true,
  async ejecutar(sock, m, ctx) {
    const destino = String(ctx.args[0] || '').replace(/\D/g, '')
    const cantidad = Math.trunc(Number(String(ctx.args[1] || '').replace(/[.,_]/g, '')))
    if (destino.length < 6 || !Number.isFinite(cantidad) || cantidad < 1) {
      return ctx.responder(mal(`Uso: ${ctx.prefijo}dar número cantidad\nEjemplo: ${ctx.prefijo}dar 51912345678 200`))
    }
    if (cantidad > MAX_REGALO) return ctx.responder(mal(`Máximo ${formato(MAX_REGALO)} monedas por regalo.`))
    if (!ctx.regalar) return ctx.responder(mal('Aquí no se pueden hacer regalos.'))
    try {
      const r = await ctx.regalar(destino, cantidad)
      return ctx.responder(ok(`Le diste ${formato(cantidad)} monedas a ${r.nombre || destino}. Te quedan ${formato(ctx.usuario.monedas)}.`))
    } catch (error) {
      return ctx.responder(mal(error.message))
    }
  }
}
