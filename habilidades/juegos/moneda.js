// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja } from '../../estilo/index.js'

export default {
  nombre: 'moneda',
  alias: ['flip', 'cara', 'caraocruz'],
  categoria: 'juegos',
  ayuda: 'Cara o cruz: .moneda',
  async ejecutar(sock, m, ctx) {
    const cara = Math.random() < 0.5
    await ctx.responder(caja('Cara o cruz', [cara ? '🪙 ¡Salió *CARA*!' : '🪙 ¡Salió *CRUZ*!']))
  }
}
