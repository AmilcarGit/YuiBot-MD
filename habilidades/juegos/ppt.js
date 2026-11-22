// Código Oficial de YuiBot-MD.by AmilcarGit
import { aleatorio } from '../../nucleo/utiles.js'

const opciones = ['piedra', 'papel', 'tijera']
const vence = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' }

export default {
  nombre: 'ppt',
  alias: [],
  categoria: 'juegos',
  ayuda: 'Piedra, papel o tijera contra el bot',
  async ejecutar(sock, m, ctx) {
    const jugador = ctx.args[0]?.toLowerCase()
    if (!opciones.includes(jugador)) return ctx.responder(`Uso: ${ctx.prefijo}ppt <piedra|papel|tijera>`)

    const bot = opciones[aleatorio(0, 2)]
    const resultado = jugador === bot ? 'Empate' : vence[jugador] === bot ? 'Ganaste' : 'Perdiste'
    await ctx.responder(`Yo elegí ${bot}. ${resultado}.`)
  }
}
