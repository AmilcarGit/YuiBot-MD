// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { buscarLetra } from '../../nucleo/delirius.js'
import { motivo } from '../../nucleo/descargas.js'

const MAX = 3200

export default {
  nombre: 'letra',
  alias: ['lyrics', 'letras'],
  categoria: 'herramientas',
  ayuda: 'Letra de una canción: .letra bad bunny dtmf',
  async ejecutar(sock, m, ctx) {
    const consulta = ctx.args.join(' ').trim()
    if (!consulta) return ctx.responder(mal(`¿De qué canción? ${ctx.prefijo}letra bad bunny dtmf`))
    try {
      const r = await buscarLetra(consulta)
      const corta = r.letra.length > MAX
      const letra = corta ? `${r.letra.slice(0, MAX).replace(/\n[^\n]*$/, '')}\n…` : r.letra
      await ctx.responder(caja('Letra', [`🎵 *${r.titulo}*`, r.artista && `👤 ${r.artista}`, r.duracion && `⏱️ ${r.duracion}`, '', letra, corta && '', corta && '✂️ La letra es larga y la corté aquí.']))
    } catch (error) {
      console.error(`letra: ${error.message}`)
      await ctx.responder(mal(`No encontré esa letra (•́︵•̀)\n🔎 ${motivo(error)}\nPrueba con artista y canción: ${ctx.prefijo}letra shakira acróstico`))
    }
  }
}
