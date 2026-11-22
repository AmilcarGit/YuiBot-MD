// Código Oficial de YuiBot-MD.by AmilcarGit
import { aleatorio, formato } from '../../nucleo/utiles.js'
import { caja, dice, mal, ok, temaActivo } from '../../estilo/index.js'

const rojos = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
const bolas = { rojo: '🔴', negro: '⚫', verde: '🟢' }

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

    if (!apuesta || apuesta < 1 || !bolas[color]) {
      return ctx.responder(mal(dice('ruletaUso', { uso: `${ctx.prefijo}ruleta apuesta rojo|negro|verde` })))
    }
    if (apuesta > u.monedas) return ctx.responder(mal(dice('ruletaPobre')))

    const numero = aleatorio(0, 36)
    const salio = numero === 0 ? 'verde' : rojos.has(numero) ? 'rojo' : 'negro'
    const cambio = salio === color ? apuesta * (color === 'verde' ? 14 : 1) : -apuesta
    u.monedas += cambio

    const e = temaActivo().emojis
    const frase = cambio > 0
      ? ok(dice('ruletaGana', { monto: formato(cambio) }))
      : mal(dice('ruletaPierde', { monto: formato(apuesta) }))

    await ctx.responder(caja('Ruleta', [
      `${e.juego} Apostaste ${formato(apuesta)} a ${bolas[color]} ${color}`,
      `${e.juego} Salió ${numero} ${bolas[salio]}`,
      '',
      frase,
      `${e.dinero} Saldo: ${formato(u.monedas)}`
    ]))
  }
}
