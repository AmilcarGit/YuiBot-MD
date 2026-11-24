// Código Oficial de YuiBot-MD.by AmilcarGit
import { buscarYoutube, esEnlaceYoutube, soltar, tomar } from '../../nucleo/descargas.js'
import { motivo } from '../../nucleo/descargas.js'
import { caja, dice, mal } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'
import { entregarAudio } from './_enviar.js'

export default {
  nombre: 'play',
  alias: ['musica', 'cancion'],
  categoria: 'descargas',
  ayuda: 'Busca una canción y te envía el audio',
  async ejecutar(sock, m, ctx) {
    const consulta = ctx.args.join(' ').trim()
    if (!consulta) return ctx.responder(mal(dice('descargaUso', { uso: `${ctx.prefijo}play nombre de la canción` })))
    if (!tomar(ctx.numero)) return ctx.responder(mal(dice('descargaOcupada')))
    try {
      await ctx.responder(dice('descargaEspera'))
      let video
      if (esEnlaceYoutube(consulta)) video = { url: consulta, titulo: consulta }
      else {
        const [primero] = await buscarYoutube(consulta, 1)
        if (!primero) return ctx.responder(mal(dice('descargaNada')))
        video = primero
      }
      await conBotones(ctx, caja('Play', [`🎵 ${video.titulo}`, video.duracion && `⏱ ${video.duracion}`, video.canal && `👤 ${video.canal}`]),
        [{ texto: '🎬 Ver en video', cmd: `ytmp4 ${video.url}` }])
      await entregarAudio(ctx, video.url, video.titulo)
    } catch (error) {
      console.error(`play: ${error.message}`)
      await ctx.responder(mal(`${dice('descargaFallo')}\n\n🔎 ${motivo(error)}`))
    } finally { soltar(ctx.numero) }
  }
}
