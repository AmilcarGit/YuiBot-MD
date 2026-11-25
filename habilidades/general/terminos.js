// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja } from '../../estilo/index.js'

export default {
  nombre: 'terminos',
  alias: ['tyc', 'reglas'],
  categoria: 'general',
  ayuda: 'Términos y condiciones de uso del bot',
  async ejecutar(sock, m, ctx) {
    await ctx.responder(caja('Términos y condiciones', [
      'Al usar a Yui aceptas estas reglas:',
      '',
      '• Las monedas y el XP son solo del juego, no valen dinero.',
      '• Nada de spam, trampas ni acoso: se bloquea.',
      '• Lo que descargues es tu responsabilidad.',
      '• Guardamos solo datos de juego y puedes pedir que se borren.',
      '',
      '📄 Completos: https://yuibot-datos.vercel.app/terminos'
    ]))
  }
}
