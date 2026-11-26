// Código Oficial de YuiBot-MD.by AmilcarGit
import { mal } from '../../estilo/index.js'
import { esEnlaceFacebook, facebookVideo, soltar, tomar } from '../../nucleo/descargas.js'

export default {
  nombre: 'facebook',
  alias: ['fb', 'fbdl', 'facebookdl'],
  categoria: 'descargas',
  ayuda: 'Descarga un video o reel de Facebook: .facebook enlace',
  async ejecutar(sock, m, ctx) {
    const enlace = ctx.args[0]
    if (!esEnlaceFacebook(enlace)) return ctx.responder(mal(`Pega el enlace de un video o reel público de Facebook: ${ctx.prefijo}facebook https://www.facebook.com/...`))
    if (!tomar(ctx.numero)) return ctx.responder(mal('Todavía estoy con tu pedido anterior, espera un poquito (>﹏<)'))
    try {
      await ctx.responder('📘 Buscando tu video de Facebook…')
      const v = await facebookVideo(enlace)
      const pie = `📘 Facebook${v.titulo ? ` · ${v.titulo}` : ''}`
      try { await ctx.enviar({ video: { url: v.hd }, mimetype: 'video/mp4', caption: pie }, { quoted: m }) }
      catch (error) {
        console.error(`facebook (HD): ${error.message}`)
        // Si el HD no sale (por tamaño o enlace vencido), se prueba con la calidad normal.
        await ctx.enviar({ video: { url: v.sd }, mimetype: 'video/mp4', caption: pie }, { quoted: m })
      }
    } catch (error) {
      console.error(`facebook: ${error.message}`)
      await ctx.responder(mal(`No pude bajar ese video de Facebook (•́︵•̀)\n🔎 ${String(error.message).replace(/https?:\/\/\S+/g, '').slice(0, 120)}`))
    } finally { soltar(ctx.numero) }
  }
}
