// Código Oficial de YuiBot-MD.by AmilcarGit
import { mal } from '../../estilo/index.js'
import { esEnlaceMediafire, mediafire } from '../../nucleo/utilidades.js'
import { motivo, soltar, tomar } from '../../nucleo/descargas.js'

export default {
  nombre: 'mediafire',
  alias: ['mf', 'mfdl'],
  categoria: 'descargas',
  ayuda: 'Descarga un archivo de MediaFire: .mediafire https://www.mediafire.com/file/…',
  async ejecutar(sock, m, ctx) {
    const enlace = String(ctx.args[0] || '').trim()
    if (!esEnlaceMediafire(enlace)) return ctx.responder(mal(`Pega el enlace de MediaFire: ${ctx.prefijo}mediafire https://www.mediafire.com/file/…`))
    if (!tomar(ctx.numero)) return ctx.responder(mal('Todavía estoy con tu pedido anterior, espera un poquito (>﹏<)'))
    try {
      await ctx.responder('📁 Buscando tu archivo…')
      const f = await mediafire(enlace)
      if (ctx.web) return await ctx.responder(`📁 *${f.nombre}*${f.peso ? ` · ${f.peso}` : ''}\n⬇️ ${f.url}`)
      await ctx.enviar({ document: { url: f.url }, mimetype: f.tipo || 'application/octet-stream', fileName: f.nombre.replace(/[\\/:*?"<>|]/g, ''), caption: `📁 ${f.nombre}${f.peso ? ` · ${f.peso}` : ''}` }, { quoted: m })
    } catch (error) {
      console.error(`mediafire: ${error.message}`)
      await ctx.responder(mal(`No pude bajar ese archivo (•́︵•̀)\n🔎 ${motivo(error)}`))
    } finally { soltar(ctx.numero) }
  }
}
