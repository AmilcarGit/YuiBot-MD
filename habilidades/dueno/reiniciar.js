// Código Oficial de YuiBot-MD.by AmilcarGit
import { guardar } from '../../nucleo/memoria.js'

export default {
  nombre: 'reiniciar',
  alias: ['restart'],
  categoria: 'dueno',
  ayuda: 'Reinicia el bot',
  soloDueno: true,
  async ejecutar(sock, m, ctx) {
    await ctx.responder('Reiniciando...')
    guardar()
    setTimeout(() => process.exit(0), 1500)
  }
}
