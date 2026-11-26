// Código Oficial de YuiBot-MD.by AmilcarGit
import { mal } from '../../estilo/index.js'
import { pinvid } from '../../nucleo/pinterest.js'
import { soltar, tomar } from '../../nucleo/descargas.js'

export default {
  nombre: 'pinvid',
  alias: ['pinvideo', 'pinterestvideo'],
  categoria: 'descargas',
  ayuda: 'Videos de Pinterest: .pinvid enlace-del-pin (o .pinvid palabras para buscar)',
  async ejecutar(sock, m, ctx) {
    const consulta = ctx.args.join(' ').trim()
    if (!consulta) return ctx.responder(mal(`Pega el enlace de un pin con video o escribe qué buscar: ${ctx.prefijo}pinvid paisajes`))
    if (!tomar(ctx.numero)) return ctx.responder(mal('Todavía estoy con tu pedido anterior, espera un poquito (>﹏<)'))
    try {
      await ctx.responder('📌 Buscando el video…')
      const [v] = await pinvid(consulta, 1)
      const pie = `📌 Pinterest${/^https?:/.test(consulta) ? '' : ` · ${consulta}`}`
      try { await ctx.enviar({ video: { url: v.video }, mimetype: 'video/mp4', caption: pie }, { quoted: m }) }
      catch { await ctx.enviar({ video: { url: v.sd }, mimetype: 'video/mp4', caption: pie }, { quoted: m }) }
    } catch (error) {
      console.error(`pinvid: ${error.message}`)
      await ctx.responder(mal(`No pude traer el video de Pinterest (•́︵•̀)\n🔎 ${String(error.message).replace(/https?:\/\/\S+/g, '').slice(0, 120)}`))
    } finally { soltar(ctx.numero) }
  }
}
