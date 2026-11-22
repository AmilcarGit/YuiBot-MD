// Código Oficial de YuiBot-MD.by AmilcarGit
import { listarSubbots } from '../../nucleo/subbots.js'

export default {
  nombre: 'subbots',
  alias: [],
  categoria: 'dueno',
  ayuda: 'Lista de sub-bots activos',
  soloDueno: true,
  async ejecutar(sock, m, ctx) {
    const lista = listarSubbots()
    if (!lista.length) return ctx.responder('No hay sub-bots activos.')
    await ctx.responder([`*Sub-bots (${lista.length})*`, ...lista.map(n => `• ${n}`)].join('\n'))
  }
}
