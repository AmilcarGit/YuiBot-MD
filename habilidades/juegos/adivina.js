// Código Oficial de YuiBot-MD.by AmilcarGit
import { aleatorio, tiempo } from '../../nucleo/utiles.js'

const PREMIO = 100
const ESPERA_PREMIO = 600000
const partidas = new Map()

export default {
  nombre: 'adivina',
  alias: [],
  categoria: 'juegos',
  ayuda: 'Adivina un número del 1 al 10',
  async ejecutar(sock, m, ctx) {
    const intento = parseInt(ctx.args[0], 10)

    if (!intento) {
      for (const [clave, p] of partidas) if (p.fin < Date.now()) partidas.delete(clave)
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
      const u = ctx.usuario
      const falta = u.ultimoAdivina + ESPERA_PREMIO - Date.now()
      if (!u.registrado) return ctx.responder('Acertaste.')
      if (falta > 0) return ctx.responder(`Acertaste. El próximo premio estará disponible en ${tiempo(falta)}.`)
      u.monedas += PREMIO
      u.ultimoAdivina = Date.now()
      return ctx.responder(`Acertaste. Ganaste ${PREMIO} monedas.`)
    }

    partida.intentos--
    if (partida.intentos <= 0) {
      partidas.delete(ctx.jid)
      return ctx.responder(`Perdiste. Era ${partida.numero}.`)
    }
    await ctx.responder(`${intento < partida.numero ? 'Más alto' : 'Más bajo'}. Te quedan ${partida.intentos} intentos.`)
  }
}
