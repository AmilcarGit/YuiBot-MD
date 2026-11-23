// Código Oficial de YuiBot-MD.by AmilcarGit
import { esEnlaceYoutube, ytmp4, soltar, tomar } from '../../nucleo/descargas.js'
import { dice, mal } from '../../estilo/index.js'

export default {
  nombre: 'ytmp4',
  alias: ['video', 'mp4'],
  categoria: 'descargas',
  ayuda: 'Descarga el video de un enlace de YouTube',
  async ejecutar(sock, m, ctx) {
    const enlace = ctx.args[0]
    if (!esEnlaceYoutube(enlace)) return ctx.responder(mal(dice('descargaUso', { uso: `${ctx.prefijo}ytmp4 enlace de YouTube` })))
    if (!tomar(ctx.numero)) return ctx.responder(mal(dice('descargaOcupada')))
    try {
      await ctx.responder(dice('descargaEspera'))
      const v = await ytmp4(enlace)
      const pie = v.titulo ? `🎬 ${v.titulo}` : '🎬'
      try {
        await ctx.enviar({ video: { url: v.url }, mimetype: 'video/mp4', caption: pie }, { quoted: m })
      } catch {
        // Si pesa demasiado para verse como video, se manda como archivo.
        await ctx.enviar({ document: { url: v.url }, mimetype: 'video/mp4', fileName: `${(v.titulo || 'video').slice(0, 60)}.mp4` }, { quoted: m })
      }
    } catch (error) {
      console.error(`ytmp4: ${error.message}`)
      await ctx.responder(mal(dice('descargaFallo')))
    } finally { soltar(ctx.numero) }
  }
}
