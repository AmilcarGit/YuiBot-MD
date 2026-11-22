// Código Oficial de YuiBot-MD.by AmilcarGit
import { aleatorio } from '../../nucleo/utiles.js'
import { caja, dice, mal, temaActivo } from '../../estilo/index.js'

const opciones = ['piedra', 'papel', 'tijera']
const iconos = { piedra: '🪨', papel: '📄', tijera: '✂️' }
const vence = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' }

export default {
  nombre: 'ppt',
  alias: [],
  categoria: 'juegos',
  ayuda: 'Piedra, papel o tijera contra el bot',
  async ejecutar(sock, m, ctx) {
    const jugador = ctx.args[0]?.toLowerCase()
    if (!opciones.includes(jugador)) {
      return ctx.responder(mal(dice('pptUso', { uso: `${ctx.prefijo}ppt piedra|papel|tijera` })))
    }

    const bot = opciones[aleatorio(0, 2)]
    const clave = jugador === bot ? 'pptEmpate' : vence[jugador] === bot ? 'pptGana' : 'pptPierde'
    const e = temaActivo().emojis
    await ctx.responder(caja('Piedra, papel o tijera', [
      `${e.persona} Tú: ${iconos[jugador]} ${jugador}`,
      `${e.titulo} Yui: ${iconos[bot]} ${bot}`,
      '',
      dice(clave)
    ]))
  }
}
