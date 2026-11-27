// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { MAX_ARCHIVO, buscarApk, tamano } from '../../nucleo/utilidades.js'
import { motivo, soltar, tomar } from '../../nucleo/descargas.js'

export default {
  nombre: 'apk',
  alias: ['apkdl', 'aplicacion', 'app'],
  categoria: 'descargas',
  ayuda: 'Busca y descarga una app de Android (APK): .apk whatsapp',
  async ejecutar(sock, m, ctx) {
    const nombre = ctx.args.join(' ').trim()
    if (!nombre) return ctx.responder(mal(`¿Qué app busco? ${ctx.prefijo}apk whatsapp`))
    if (!tomar(ctx.numero)) return ctx.responder(mal('Todavía estoy con tu pedido anterior, espera un poquito (>﹏<)'))
    try {
      await ctx.responder('📲 Buscando la app…')
      const a = await buscarApk(nombre)
      const ficha = caja('APK', [`📲 *${a.nombre}*`, a.paquete && `📦 ${a.paquete}`, a.desarrollador && `👤 ${a.desarrollador}`, `💾 ${a.peso || tamano(a.bytes)}`, a.descargas && `⬇️ ${a.descargas.toLocaleString('es')} descargas`, a.actualizado && `🗓️ ${a.actualizado}`])
      const muyGrande = a.bytes > MAX_ARCHIVO
      if (ctx.web || muyGrande) {
        const pie = muyGrande ? `\n⚠️ Pesa más de ${tamano(MAX_ARCHIVO)}: descárgala desde este enlace.` : '\n⬇️ Descárgala aquí:'
        return await (a.icono ? ctx.enviar({ image: { url: a.icono }, caption: `${ficha}${pie}\n${a.url}` }, { quoted: m }).catch(() => ctx.responder(`${ficha}${pie}\n${a.url}`)) : ctx.responder(`${ficha}${pie}\n${a.url}`))
      }
      if (a.icono) await ctx.enviar({ image: { url: a.icono }, caption: ficha }, { quoted: m }).catch(() => {})
      await ctx.enviar({ document: { url: a.url }, mimetype: 'application/vnd.android.package-archive', fileName: `${a.nombre}.apk`.replace(/[\\/:*?"<>|]/g, '') }, { quoted: m })
    } catch (error) {
      console.error(`apk: ${error.message}`)
      await ctx.responder(mal(`No pude conseguir esa app (•́︵•̀)\n🔎 ${motivo(error)}`))
    } finally { soltar(ctx.numero) }
  }
}
