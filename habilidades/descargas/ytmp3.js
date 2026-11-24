// Código Oficial de YuiBot-MD.by AmilcarGit
import { esEnlaceYoutube, ytmp3, ytaudioYui, soltar, tomar } from '../../nucleo/descargas.js'
import { motivo } from '../../nucleo/descargas.js'
import { dice, mal } from '../../estilo/index.js'
import { entregarAudio } from './_enviar.js'

export default {
  nombre: 'ytmp3',
  alias: ['audio', 'mp3'],
  categoria: 'descargas',
  ayuda: 'Descarga el audio de un enlace de YouTube',
  async ejecutar(sock, m, ctx) {
    const enlace = ctx.args[0]
    if (!esEnlaceYoutube(enlace)) return ctx.responder(mal(dice('descargaUso', { uso: `${ctx.prefijo}ytmp3 enlace de YouTube` })))
    if (!tomar(ctx.numero)) return ctx.responder(mal(dice('descargaOcupada')))
    try {
      await ctx.responder(dice('descargaEspera'))
      await entregarAudio(ctx, enlace, 'audio')
    } catch (error) {
      console.error(`ytmp3: ${error.message}`)
      await ctx.responder(mal(`${dice('descargaFallo')}\n\n🔎 ${motivo(error)}`))
    } finally { soltar(ctx.numero) }
  }
}
