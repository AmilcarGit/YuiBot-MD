// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { infoAnime } from '../../nucleo/delirius.js'
import { motivo } from '../../nucleo/descargas.js'

export default {
  nombre: 'anime',
  alias: ['animeinfo', 'infoanime', 'mal'],
  categoria: 'herramientas',
  ayuda: 'Ficha de un anime con puntaje, episodios y sinopsis: .anime Naruto',
  async ejecutar(sock, m, ctx) {
    const nombre = ctx.args.join(' ').trim()
    if (!nombre) return ctx.responder(mal(`¿Qué anime busco? ${ctx.prefijo}anime Naruto`))
    try {
      const a = await infoAnime(nombre)
      const sinopsis = a.sinopsis.length > 450 ? `${a.sinopsis.slice(0, 450).replace(/\s+\S*$/, '')}…` : a.sinopsis
      const ficha = caja('Anime', [
        `🎌 *${a.titulo}*${a.japones ? ` (${a.japones})` : ''}`,
        a.puntaje && `⭐ ${a.puntaje}${a.ranking ? ` · ranking ${a.ranking}` : ''}`,
        [a.tipo, a.episodios && `${a.episodios} episodios`, a.duracion].filter(Boolean).join(' · ') && `📺 ${[a.tipo, a.episodios && `${a.episodios} episodios`, a.duracion].filter(Boolean).join(' · ')}`,
        a.estado && `📡 ${a.estado}`,
        a.emision && `🗓️ ${a.emision}`,
        a.generos.length && `🏷️ ${a.generos.join(', ')}`,
        a.estudios.length && `🎬 ${a.estudios.join(', ')}`,
        '', sinopsis, a.enlace && '', a.enlace && `🔗 ${a.enlace}`
      ])
      if (a.imagen) { try { return await ctx.enviar({ image: { url: a.imagen }, caption: ficha }, { quoted: m }) } catch {} }
      await ctx.responder(ficha)
    } catch (error) {
      console.error(`anime: ${error.message}`)
      await ctx.responder(mal(`No encontré ese anime (•́︵•̀)\n🔎 ${motivo(error)}`))
    }
  }
}
