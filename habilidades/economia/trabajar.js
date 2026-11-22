// Código Oficial de YuiBot-MD.by AmilcarGit
import { trabajos, ganarXp, logro } from '../../nucleo/juego.js'
import { aleatorio, formato, tiempo } from '../../nucleo/utiles.js'

export default {
  nombre: 'trabajar',
  alias: ['work'],
  categoria: 'economia',
  ayuda: 'Elige un trabajo y cobra',
  registro: true,
  async ejecutar(sock, m, ctx) {
    const u = ctx.usuario
    const elegido = ctx.args[0]?.toLowerCase()

    if (elegido) {
      const nuevo = trabajos.find(t => t.id === elegido)
      if (!nuevo) return ctx.responder('Ese trabajo no existe.')
      if (u.nivel < nuevo.nivel) return ctx.responder(`Necesitas nivel ${nuevo.nivel}.`)
      u.trabajo = nuevo.id
      return ctx.responder(`Ahora eres ${nuevo.nombre}.`)
    }

    const trabajo = trabajos.find(t => t.id === u.trabajo)
    if (!trabajo) {
      return ctx.responder([
        'Elige un trabajo:',
        ...trabajos.map(t => `• ${t.id} (nivel ${t.nivel}): ${t.pago[0]}-${t.pago[1]} monedas`),
        `Uso: ${ctx.prefijo}trabajar <trabajo>`
      ].join('\n'))
    }

    // El descanso se fija con el trabajo que se cobró, así cambiar de oficio no lo salta.
    const falta = u.ultimoTrabajo + (u.esperaTrabajo || trabajo.espera) - Date.now()
    if (falta > 0) return ctx.responder(`Descansa ${tiempo(falta)} más.`)

    const pago = Math.floor(aleatorio(...trabajo.pago) * (u.inventario.pico ? 1.25 : 1))
    u.monedas += pago
    u.ultimoTrabajo = Date.now()
    u.esperaTrabajo = trabajo.espera
    ganarXp(u, 25)

    const extra = logro(u, 'primerTrabajo') ? '\nLogro: Primer trabajo' : ''
    await ctx.responder(`Trabajaste de ${trabajo.nombre} y ganaste ${formato(pago)} monedas.${extra}`)
  }
}
