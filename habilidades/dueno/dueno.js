// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../../ajustes.js'

export default {
  nombre: 'dueno',
  alias: ['owner', 'creador'],
  categoria: 'general',
  ayuda: 'Contacto del creador',
  async ejecutar(sock, m, ctx) {
    await ctx.responder(`Creador: ${ajustes.creador}\nContacto: wa.me/${ajustes.dueno[0]}`)
  }
}
