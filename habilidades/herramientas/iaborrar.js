// Código Oficial de YuiBot-MD.by AmilcarGit
import { ok } from '../../estilo/index.js'
import { borrarHistorial } from '../../nucleo/charla.js'

export default { categoria: 'herramientas', nombre: 'iaborrar', alias: ['olvidaria'], ayuda: 'Borrar lo que la IA recuerda de tu charla',
  async ejecutar(sock, m, ctx) {
    borrarHistorial(ctx.numero)
    return ctx.responder(ok('Borré el recuerdo de nuestra charla 🧹'))
  } }
