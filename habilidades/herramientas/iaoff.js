// Código Oficial de YuiBot-MD.by AmilcarGit
import { ok } from '../../estilo/index.js'
import { estado } from '../../nucleo/charla.js'

export default { categoria: 'herramientas', nombre: 'iaoff', alias: ['iadesactivar'], ayuda: 'Desactivar la charla automática con la IA',
  async ejecutar(sock, m, ctx) {
    estado(ctx.usuario).activa = false
    return ctx.responder(ok(`IA desactivada. Cuando quieras volver escribe ${ctx.prefijo || '.'}iaacepto`))
  } }
