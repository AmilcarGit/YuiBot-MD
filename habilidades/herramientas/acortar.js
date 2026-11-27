// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { acortar, esEnlace } from '../../nucleo/herramientas.js'

export default {
  nombre: 'acortar',
  alias: ['short', 'shorturl', 'acorta'],
  categoria: 'herramientas',
  ayuda: 'Acorta un enlace largo: .acortar https://…',
  async ejecutar(sock, m, ctx) {
    const enlace = ctx.args[0]
    if (!esEnlace(enlace)) return ctx.responder(mal(`Pega un enlace completo: ${ctx.prefijo}acortar https://ejemplo.com/pagina-larga`))
    try { await ctx.responder(caja('Enlace corto', [`🔗 ${await acortar(enlace)}`])) }
    catch (error) { console.error(`acortar: ${error.message}`); await ctx.responder(mal('No pude acortar ese enlace (•́︵•̀) Revisa que sea válido.')) }
  }
}
