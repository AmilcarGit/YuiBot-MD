// Código Oficial de YuiBot-MD.by AmilcarGit
import { ok } from '../../estilo/index.js'
import { REGLAS_IA } from '../../nucleo/charla.js'

export default { categoria: 'herramientas', nombre: 'iareglas', alias: ['iaterminos', 'reglasia'], ayuda: 'Términos y reglas de la IA de Yui',
  async ejecutar(sock, m, ctx) {
    const p = ctx.prefijo || '.'
    const lista = [{ texto: '✅ Acepto', cmd: 'iaacepto' }, { texto: '❌ Desactivar IA', cmd: 'iaoff' }]
    if (typeof ctx.botones === 'function') return ctx.botones(REGLAS_IA, lista)
    return ctx.responder(`${REGLAS_IA}\n\n${p}iaacepto para aceptar · ${p}iaoff para desactivar`)
  } }
