// Código Oficial de YuiBot-MD.by AmilcarGit
import { mal } from '../../estilo/index.js'
import { esEnlacePin, pinimg } from '../../nucleo/pinterest.js'
import { soltar, tomar } from '../../nucleo/descargas.js'

const CUANTAS = 3
export default {
  nombre: 'pin',
  alias: ['pinterest', 'pinimg', 'imagen'],
  categoria: 'descargas',
  ayuda: 'Imágenes de Pinterest: .pin gatitos kawaii (busca) o .pin enlace-del-pin (la baja)',
  async ejecutar(sock, m, ctx) {
    const consulta = ctx.args.join(' ').trim()
    if (!consulta) return ctx.responder(mal(`Dime qué buscar: ${ctx.prefijo}pin gatitos kawaii\nO pega el enlace de un pin: ${ctx.prefijo}pin https://pin.it/...`))
    if (!tomar(ctx.numero)) return ctx.responder(mal('Todavía estoy con tu pedido anterior, espera un poquito (>﹏<)'))
    try {
      await ctx.responder('📌 Buscando en Pinterest…')
      if (esEnlacePin(consulta)) {
        const p = await pinimg(consulta)
        if (!p.imagen) throw new Error('el pin no tiene imagen')
        const pie = [p.titulo && `📌 ${p.titulo}`, p.descripcion && p.descripcion.slice(0, 180), p.autor && `👤 ${p.autor}`, p.guardados != null && `💾 ${p.guardados} guardados`, p.url].filter(Boolean).join('\n')
        return await ctx.enviar({ image: { url: p.imagen }, caption: pie }, { quoted: m })
      }
      const lista = (await pinimg(consulta, 12)).sort(() => Math.random() - 0.5).slice(0, CUANTAS)
      for (const item of lista) await ctx.enviar({ image: { url: item.image }, caption: `📌 ${consulta}\n${item.url}` }, { quoted: m })
    } catch (error) {
      console.error(`pin: ${error.message}`)
      await ctx.responder(mal(`No pude traer imágenes de Pinterest (•́︵•̀)\n🔎 ${String(error.message).replace(/https?:\/\/\S+/g, '').slice(0, 120)}`))
    } finally { soltar(ctx.numero) }
  }
}
