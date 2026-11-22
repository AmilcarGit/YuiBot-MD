// Código Oficial de YuiBot-MD.by AmilcarGit
import { aleatorio } from '../../nucleo/utiles.js'

const partidas = new Map()

export default {
  nombre: 'adivina',
  alias: [],
  categoria: 'juegos',
  ayuda: 'Adivina un número del 1 al 10',
  async ejecutar(sock, m, ctx) {
    const intento = parseInt(ctx.args[0], 10)

    if (!intento) {
      partidas.set(ctx.jid, { numero: aleatorio(1, 10), intentos: 3, fin: Date.now() + 120000 })
      return ctx.responder(`Pensé un número del 1 al 10. Tienes 3 intentos: ${ctx.prefijo}adivina <número>`)
    }

    const partida = partidas.get(ctx.jid)
    if (!partida || partida.fin < Date.now()) {
      partidas.delete(ctx.jid)
      return ctx.responder(`No hay partida activa. Usa ${ctx.prefijo}adivina para empezar.`)
    }

    if (intento === partida.numero) {
      partidas.delete(ctx.jid)
      const premio = ctx.usuario.registrado
      if (premio) ctx.usuario.monedas += 100
      return ctx.responder(`Acertaste.${premio ? ' Ganaste 100 monedas.' : ''}`)
    }

    partida.intentos--
    if (partida.intentos <= 0) {
      partidas.delete(ctx.jid)
      return ctx.responder(`Perdiste. Era ${partida.numero}.`)
    }
    await ctx.responder(`${intento < partida.numero ? 'Más alto' : 'Más bajo'}. Te quedan ${partida.intentos} intentos.`)
  }
}
