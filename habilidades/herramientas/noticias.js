// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { codigoPais, noticias, nombrePais } from '../../nucleo/utilidades.js'

export default {
  nombre: 'noticias',
  alias: ['noticia', 'news', 'titulares'],
  categoria: 'herramientas',
  ayuda: 'Titulares del día: .noticias · .noticias mx · .noticias fútbol · .noticias mx economía',
  async ejecutar(sock, m, ctx) {
    const args = [...ctx.args]
    const pais = codigoPais(args[0]) ? args.shift().toLowerCase() : 'pe'
    const tema = args.join(' ').trim().slice(0, 60)
    try {
      const lista = await noticias({ pais, tema })
      await ctx.responder(caja(`Noticias${tema ? `: ${tema}` : ''} · ${nombrePais(pais)}`, lista.map((n, i) => `${i + 1}. *${n.titulo}*${n.fuente ? `\n   📰 ${n.fuente}` : ''}\n   🔗 ${n.enlace}`)))
    } catch (error) {
      console.error(`noticias: ${error.message}`)
      await ctx.responder(mal(error.message === 'sin noticias' ? `No encontré noticias${tema ? ` de "${tema}"` : ''}.` : 'No pude traer las noticias ahora mismo (•́︵•̀)'))
    }
  }
}
