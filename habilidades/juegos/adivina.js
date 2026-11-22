// Código Oficial de YuiBot-MD.by AmilcarGit
import { aleatorio, tiempo } from '../../nucleo/utiles.js'
import { caja, dice, mal, ok, temaActivo } from '../../estilo/index.js'

const PREMIO = 100
const ESPERA_PREMIO = 600000
const partidas = new Map()

export default {
  nombre: 'adivina',
  alias: [],
  categoria: 'juegos',
  ayuda: 'Adivina un número del 1 al 10',
  async ejecutar(sock, m, ctx) {
    const e = temaActivo().emojis
    const intento = parseInt(ctx.args[0], 10)

    if (!intento) {
      for (const [clave, p] of partidas) if (p.fin < Date.now()) partidas.delete(clave)
      partidas.set(ctx.jid, { numero: aleatorio(1, 10), intentos: 3, fin: Date.now() + 120000 })
      return ctx.responder(caja('Adivina el número', [
        dice('adivinaInicio', { prefijo: ctx.prefijo }),
        '',
        `${e.juego} Del 1 al 10 · 3 intentos · 2 minutos`
      ]))
    }

    const partida = partidas.get(ctx.jid)
    if (!partida || partida.fin < Date.now()) {
      partidas.delete(ctx.jid)
      return ctx.responder(mal(dice('adivinaSinPartida', { prefijo: ctx.prefijo })))
    }

    if (intento === partida.numero) {
      partidas.delete(ctx.jid)
      const u = ctx.usuario
      if (!u.registrado) {
        return ctx.responder(ok(dice('adivinaGanaSinPremio', { motivo: `regístrate con ${ctx.prefijo}registrar` })))
      }
      const falta = u.ultimoAdivina + ESPERA_PREMIO - Date.now()
      if (falta > 0) return ctx.responder(ok(dice('adivinaGanaEspera', { tiempo: tiempo(falta) })))
      u.monedas += PREMIO
      u.ultimoAdivina = Date.now()
      return ctx.responder(ok(dice('adivinaGana', { premio: PREMIO })))
    }

    partida.intentos--
    if (partida.intentos <= 0) {
      partidas.delete(ctx.jid)
      return ctx.responder(mal(dice('adivinaPierde', { numero: partida.numero })))
    }
    await ctx.responder(`${e.juego} ${dice('adivinaPista', {
      pista: intento < partida.numero ? '⬆️ Más alto' : '⬇️ Más bajo',
      intentos: partida.intentos
    })}`)
  }
}
