// Código Oficial de YuiBot-MD.by AmilcarGit
import { cnvYoutube, esEnlaceYoutube, ytmp4, ytmp4Local, limpiarLocal, soltar, tomar } from '../../nucleo/descargas.js'
import fs from 'fs'
import { motivo } from '../../nucleo/descargas.js'
import { dice, mal } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'

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
      // 1) yt-dlp en esta máquina (si está instalado); 2) las APIs.
      let local = null
      try { local = await ytmp4Local(enlace) } catch (error) { console.error(`ytmp4 local: ${error.message}`) }
      if (local) {
        try {
          const pie = local.titulo ? `🎬 ${local.titulo}` : '🎬'
          const archivo = fs.readFileSync(local.archivo)
          try { await ctx.enviar({ video: archivo, mimetype: 'video/mp4', caption: pie }, { quoted: m }) }
          catch { await ctx.enviar({ document: archivo, mimetype: 'video/mp4', fileName: `${(local.titulo || 'video').slice(0, 60)}.mp4` }, { quoted: m }) }
        } finally { limpiarLocal(local) }
        return
      }
      let v
      try { v = await ytmp4(enlace) } catch (errorApis) {
        // Último respaldo: CNV entrega el archivo (en la web no cabe un video en la respuesta, así que solo en WhatsApp).
        if (ctx.web) throw errorApis
        console.error(`ytmp4 apis: ${errorApis.message}`)
        const c = await cnvYoutube(enlace, 'mp4', { maxBytes: 60 * 1024 * 1024 })
        const pie = c.titulo ? `🎬 ${c.titulo}` : '🎬'
        try { await ctx.enviar({ video: c.buffer, mimetype: 'video/mp4', caption: pie }, { quoted: m }) }
        catch { await ctx.enviar({ document: c.buffer, mimetype: 'video/mp4', fileName: `${(c.titulo || 'video').slice(0, 60)}.mp4` }, { quoted: m }) }
        return
      }
      const pie = v.titulo ? `🎬 ${v.titulo}` : '🎬'
      try {
        await ctx.enviar({ video: { url: v.url }, mimetype: 'video/mp4', caption: pie }, { quoted: m })
      } catch {
        // Si pesa demasiado para verse como video, se manda como archivo.
        await ctx.enviar({ document: { url: v.url }, mimetype: 'video/mp4', fileName: `${(v.titulo || 'video').slice(0, 60)}.mp4` }, { quoted: m })
      }
    } catch (error) {
      console.error(`ytmp4: ${error.message}`)
      // Si el video no sale, se ofrece el audio, que casi siempre funciona.
      await conBotones(ctx, mal(`${dice('descargaFallo')}\n\n🔎 ${motivo(error)}`), [{ texto: '🎵 Mejor el audio', cmd: `ytmp3 ${enlace}` }])
    } finally { soltar(ctx.numero) }
  }
}
