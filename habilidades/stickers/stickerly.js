// Código Oficial de YuiBot-MD.by AmilcarGit
// Descarga un paquete completo de Sticker.ly y lo manda de corrido, en orden y con la firma del bot.
// (Yui-Bails no trae el mensaje nativo de "paquete de stickers", por eso se envían uno tras otro, rápido y seguidos.)
import { caja, mal } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'
import { bajar, buscarStickerly, esEnlaceStickerly, packStickerly } from '../../nucleo/delirius.js'
import { motivo, soltar, tomar } from '../../nucleo/descargas.js'
import { aWebp, conMetadatos, esWebp, firmaSticker } from '../../nucleo/stickers.js'
import ajustes from '../../ajustes.js'

const MAXIMO = 30
const PAUSA_MS = 700
const dormir = ms => new Promise(r => setTimeout(r, ms))

export async function prepararSticker(url, pack, solicitante) {
  let b = await bajar(url, 2 * 1024 * 1024)
  if (!esWebp(b)) b = await aWebp(b, { animado: false })
  const f = firmaSticker({ bot: ajustes.nombre, solicitante, tipo: 'sticker', pack: pack.nombre, autor: pack.autor ? `${pack.autor} · ${ajustes.nombre}` : '' })
  return conMetadatos(b, f.pack, f.autor, f.emojis)
}

export default {
  nombre: 'stickerly',
  alias: ['paquete', 'stickerpack', 'packstickers', 'pack'],
  categoria: 'stickers',
  ayuda: 'Descarga un paquete de stickers completo: .stickerly anime · .stickerly enlace de sticker.ly · .stickerly enlace 10',
  async ejecutar(sock, m, ctx) {
    const conNumero = /^\d{1,2}$/.test(ctx.args.at(-1) || '') && ctx.args.length > 1
    const limite = conNumero ? Math.min(MAXIMO, Math.max(1, Number(ctx.args.at(-1)))) : MAXIMO
    const consulta = (conNumero ? ctx.args.slice(0, -1) : ctx.args).join(' ').trim()
    if (!consulta) return ctx.responder(mal(`¿Qué paquete busco? ${ctx.prefijo}stickerly anime\nO pega un enlace de sticker.ly (con un número al final si quieres solo algunos).`))

    if (!esEnlaceStickerly(consulta)) {
      let lista
      try { lista = await buscarStickerly(consulta) } catch (error) { console.error(`stickerly buscar: ${error.message}`); return ctx.responder(mal(`No pude buscar paquetes ahora mismo (•́︵•̀)\n🔎 ${motivo(error)}`)) }
      if (!lista.length) return ctx.responder(mal(`No encontré paquetes con "${consulta.slice(0, 40)}".`))
      const linea = x => `${x.animado ? '✨' : '🖼️'} ${x.cantidad} stickers · ${x.autor}`.slice(0, 72)
      if (!ctx.botonesActivos) return ctx.responder(caja(`Paquetes: ${consulta}`, lista.map((x, i) => `${i + 1}. ${x.nombre}\n   ${linea(x)}\n   ${ctx.prefijo}stickerly ${x.url}`)))
      return conBotones(ctx, `🧩 Paquetes de "${consulta.slice(0, 30)}"\n\n👇 Elige uno y te lo mando completo`, [{
        texto: '🧩 Elegir paquete',
        secciones: [{ titulo: 'Sticker.ly', filas: lista.map(x => ({ titulo: x.nombre.slice(0, 24) || 'Paquete', descripcion: linea(x), cmd: `stickerly ${x.url}` })) }]
      }], { media: lista[0].imagen, enLinea: true })
    }

    if (!tomar(ctx.numero)) return ctx.responder(mal('Todavía estoy con tu pedido anterior, espera un poquito (>﹏<)'))
    try {
      const pack = await packStickerly(consulta)
      const cuantos = Math.min(limite, pack.stickers.length)
      await ctx.enviar({ image: { url: pack.imagen }, caption: caja('Paquete de stickers', [`🧩 *${pack.nombre}*`, pack.autor && `👤 ${pack.autor}`, `${pack.animado ? '✨ Animados' : '🖼️ Fijos'} · 📦 ${cuantos}${cuantos < pack.stickers.length ? ` de ${pack.stickers.length}` : ''} stickers`, '⏳ Te los mando seguidos…']) }, { quoted: m }).catch(() => {})
      // Se preparan de a 4 a la vez, pero se envían en orden y sin hacer esperar.
      const urls = pack.stickers.slice(0, cuantos)
      let enviados = 0
      for (let i = 0; i < urls.length; i += 4) {
        const lote = await Promise.allSettled(urls.slice(i, i + 4).map(u => prepararSticker(u, pack, ctx.usuario?.nombre)))
        for (const r of lote) {
          if (r.status !== 'fulfilled') { console.error(`stickerly sticker: ${r.reason?.message}`); continue }
          await ctx.enviar({ sticker: r.value })
          enviados++
          await dormir(PAUSA_MS)
        }
      }
      if (!enviados) throw new Error('No pude preparar ningún sticker')
      await ctx.responder(`✅ Listo, ${enviados} stickers de *${pack.nombre}*. Para guardarlos, toca cada sticker y elige "Agregar a favoritos".`)
    } catch (error) {
      console.error(`stickerly: ${error.message}`)
      await ctx.responder(mal(`No pude bajar ese paquete (•́︵•̀)\n🔎 ${motivo(error)}`))
    } finally { soltar(ctx.numero) }
  }
}
