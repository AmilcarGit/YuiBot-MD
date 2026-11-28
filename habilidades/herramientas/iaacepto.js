// Código Oficial de YuiBot-MD.by AmilcarGit
import { ok } from '../../estilo/index.js'
import { estado } from '../../nucleo/charla.js'

export default { categoria: 'herramientas', nombre: 'iaacepto', alias: ['iaon', 'aceptoia'], ayuda: 'Aceptar las reglas y activar la charla con la IA',
  async ejecutar(sock, m, ctx) {
    const e = estado(ctx.usuario)
    e.acepto = Date.now(); e.activa = true
    return ctx.responder(ok('¡Listo! Ya puedo charlar contigo: en chat privado y en la página solo escríbeme sin comandos 🎀'))
  } }
