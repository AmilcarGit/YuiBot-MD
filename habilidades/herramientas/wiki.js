// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { wikipedia } from '../../nucleo/herramientas.js'

export default {
  nombre: 'wiki',
  alias: ['wikipedia', 'que-es', 'quees'],
  categoria: 'herramientas',
  ayuda: 'Resumen de Wikipedia: .wiki Machu Picchu (en inglés: .wiki en Albert Einstein)',
  async ejecutar(sock, m, ctx) {
    const args = [...ctx.args]
    const idioma = /^(es|en|pt|fr|de|it|ja)$/i.test(args[0] || '') && args.length > 1 ? args.shift().toLowerCase() : 'es'
    const tema = args.join(' ').trim()
    if (!tema) return ctx.responder(mal(`¿Qué quieres buscar? ${ctx.prefijo}wiki Machu Picchu`))
    try {
      const r = await wikipedia(tema, idioma)
      if (!r) return ctx.responder(mal(`No encontré "${tema.slice(0, 40)}" en Wikipedia.`))
      const texto = r.texto.length > 700 ? `${r.texto.slice(0, 700).replace(/\s+\S*$/, '')}…` : r.texto
      const cuerpo = caja(r.titulo, [r.descripcion && `📌 ${r.descripcion}`, '', texto, '', `🔗 ${r.enlace}`])
      if (r.imagen) { try { return await ctx.enviar({ image: { url: r.imagen }, caption: cuerpo }, { quoted: m }) } catch {} }
      await ctx.responder(cuerpo)
    } catch (error) {
      console.error(`wiki: ${error.message}`)
      await ctx.responder(mal('No pude consultar Wikipedia ahora mismo (•́︵•̀)'))
    }
  }
}
