// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../../ajustes.js'
import { caja, dice, firma, temaActivo } from '../../estilo/index.js'

export default {
  nombre: 'dueno',
  alias: ['owner', 'creador'],
  categoria: 'general',
  ayuda: 'Contacto del creador',
  async ejecutar(sock, m, ctx) {
    const e = temaActivo().emojis
    await ctx.responder(caja('Mi creador', [
      dice('dueno'),
      '',
      `${e.persona} ${ajustes.creador}`,
      `📱 wa.me/${ajustes.dueno[0]}`,
      '',
      firma()
    ]))
  }
}
