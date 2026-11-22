// Código Oficial de YuiBot-MD.by AmilcarGit
import { tirar, logro } from '../../nucleo/juego.js'

const COSTO = 200

export default {
  nombre: 'gacha',
  alias: ['invocar'],
  categoria: 'economia',
  ayuda: `Invoca un personaje por ${COSTO} monedas`,
  registro: true,
  async ejecutar(sock, m, ctx) {
    const u = ctx.usuario
    if (u.monedas < COSTO) return ctx.responder(`Necesitas ${COSTO} monedas.`)

    u.monedas -= COSTO
    const { rareza, personaje } = tirar(Boolean(u.inventario.amuleto))
    u.coleccion[personaje] = (u.coleccion[personaje] || 0) + 1

    const extra = rareza === 'Legendaria' && logro(u, 'legendario') ? '\nLogro: Personaje legendario' : ''
    await ctx.responder(`Invocaste a *${personaje}* (${rareza}).${extra}`)
  }
}
