// Código Oficial de YuiBot-MD.by AmilcarGit
import { mal } from '../../estilo/index.js'
import { capturaWeb, normalizarWeb } from '../../nucleo/delirius.js'

export default {
  nombre: 'ssweb',
  alias: ['ss', 'captura', 'screenshot', 'capturaweb'],
  categoria: 'herramientas',
  ayuda: 'Captura de pantalla de una página web: .ssweb https://example.com',
  async ejecutar(sock, m, ctx) {
    const enlace = normalizarWeb(ctx.args[0])
    if (!enlace) return ctx.responder(mal(`Pásame la página: ${ctx.prefijo}ssweb https://example.com`))
    try {
      await ctx.responder('📸 Sacando la captura…')
      const url = await capturaWeb(enlace)
      await ctx.enviar({ image: { url }, caption: `📸 ${enlace.slice(0, 200)}` }, { quoted: m })
    } catch (error) {
      console.error(`ssweb: ${error.message}`)
      await ctx.responder(mal('No pude capturar esa página (•́︵•̀) Puede que no cargue o bloquee las capturas.'))
    }
  }
}
