// Código Oficial de YuiBot-MD.by AmilcarGit
import { guardar } from '../../nucleo/memoria.js'
import { aviso, dice } from '../../estilo/index.js'

export default {
  nombre: 'reiniciar',
  alias: ['restart'],
  categoria: 'dueno',
  ayuda: 'Reinicia el bot',
  soloDueno: true,
  async ejecutar(sock, m, ctx) {
    await ctx.responder(aviso(dice('reiniciando')))
    guardar()
    setTimeout(() => process.exit(0), 1500)
  }
}
