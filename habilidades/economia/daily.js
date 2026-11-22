// Código Oficial de YuiBot-MD.by AmilcarGit
import { formato, tiempo } from '../../nucleo/utiles.js'
import { ganarXp, logro } from '../../nucleo/juego.js'

const DIA = 86400000

export default {
  nombre: 'daily',
  alias: ['diario'],
  categoria: 'economia',
  ayuda: 'Recompensa diaria con racha',
  registro: true,
  async ejecutar(sock, m, ctx) {
    const u = ctx.usuario
    const ahora = Date.now()
    const falta = u.ultimoDaily + DIA - ahora
    if (falta > 0) return ctx.responder(`Vuelve en ${tiempo(falta)}.`)

    u.racha = ahora - u.ultimoDaily < DIA * 2 ? u.racha + 1 : 1
    u.ultimoDaily = ahora

    const premio = 500 + Math.min(u.racha, 7) * 50 + (u.inventario.mochila ? 100 : 0)
    u.monedas += premio
    ganarXp(u, 50)

    const extra = u.racha >= 7 && logro(u, 'racha7') ? '\nLogro: Racha de 7 días' : ''
    await ctx.responder(`Recompensa diaria: ${formato(premio)} monedas.\nRacha: ${u.racha} días.${extra}`)
  }
}
