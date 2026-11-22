// Código Oficial de YuiBot-MD.by AmilcarGit
import { aleatorio, formato } from '../../nucleo/utiles.js'

const rojos = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

export default {
  nombre: 'ruleta',
  alias: [],
  categoria: 'juegos',
  ayuda: 'Apuesta a rojo, negro o verde',
  registro: true,
  async ejecutar(sock, m, ctx) {
    const u = ctx.usuario
    const apuesta = parseInt(ctx.args[0], 10)
    const color = ctx.args[1]?.toLowerCase()

    if (!apuesta || apuesta < 1 || !['rojo', 'negro', 'verde'].includes(color)) {
      return ctx.responder(`Uso: ${ctx.prefijo}ruleta <apuesta> <rojo|negro|verde>`)
    }
    if (apuesta > u.monedas) return ctx.responder('No tienes monedas suficientes.')

    const numero = aleatorio(0, 36)
    const salio = numero === 0 ? 'verde' : rojos.has(numero) ? 'rojo' : 'negro'
    const cambio = salio === color ? apuesta * (color === 'verde' ? 14 : 1) : -apuesta
    u.monedas += cambio

    const resultado = cambio > 0 ? `Ganaste ${formato(cambio)}` : `Perdiste ${formato(apuesta)}`
    await ctx.responder(`Salió ${numero} (${salio}). ${resultado} monedas.`)
  }
}
