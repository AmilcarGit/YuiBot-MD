// Código Oficial de YuiBot-MD.by AmilcarGit
import { listarSubbots } from '../../nucleo/subbots.js'
import { aviso, caja, dice, temaActivo } from '../../estilo/index.js'

export default {
  nombre: 'subbots',
  alias: [],
  categoria: 'dueno',
  ayuda: 'Lista de sub-bots activos',
  soloDueno: true,
  async ejecutar(sock, m, ctx) {
    const lista = listarSubbots()
    if (!lista.length) return ctx.responder(aviso(dice('subbotsVacio')))
    const e = temaActivo().emojis
    await ctx.responder(caja(`Sub-bots (${lista.length})`, lista.map(n => `${e.item} ${n}`)))
  }
}
