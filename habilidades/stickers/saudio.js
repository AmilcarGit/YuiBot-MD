// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../../ajustes.js'
import { mal, ok } from '../../estilo/index.js'
import { aOpus, aWebp, conMetadatos, firmaSticker, duracion, hayFfmpeg, ondaDeAudio, SEG_SONIDO } from '../../nucleo/stickers.js'
import { buscarMedio, descargar, enviarStickerSonido, soltarTurno, tomarTurno } from './_comun.js'

export default {
  nombre: 'saudio',
  alias: ['stickeraudio', 'stickersonido', 'ssonido', 'sa'],
  categoria: 'stickers',
  ayuda: 'Sticker con sonido: responde a un video (usa su audio) o a una nota de voz/audio',
  async ejecutar(sock, m, ctx) {
    if (!(await hayFfmpeg())) return ctx.responder(mal('Falta ffmpeg en el servidor del bot para crear stickers.'))
    const medio = buscarMedio(m, ctx.jid)
    const esAudio = medio?.tipo === 'audioMessage' || /^audio\//.test(medio?.nodo?.mimetype || '')
    const esVideo = medio?.tipo === 'videoMessage' || /^video\//.test(medio?.nodo?.mimetype || '')
    if (!esAudio && !esVideo) {
      return ctx.responder(mal(`Responde a un video o a un audio con ${ctx.prefijo}saudio.\n• Video: el sticker se mueve y suena con su audio.\n• Audio o nota de voz: el sticker es una onda que baila con el sonido.\nDuran hasta ${SEG_SONIDO} segundos.`))
    }
    if (!tomarTurno(ctx.numero)) return ctx.responder(mal('Una a la vez, ¿sí? Termino el sticker anterior y sigo contigo.'))
    try {
      if (Number(medio.nodo.fileLength) > 15 * 1024 * 1024) return ctx.responder(mal('Ese archivo pesa demasiado (máximo 15 MB).'))
      await ctx.responder('🎶 Preparando tu sticker con sonido…')
      const buffer = await descargar(sock, medio)
      const largo = Math.min(SEG_SONIDO, (await duracion(buffer)) || SEG_SONIDO)
      const [animacion, audio] = await Promise.all([
        esVideo ? aWebp(buffer, { animado: true, segundos: largo }) : ondaDeAudio(buffer, largo),
        aOpus(buffer, largo)
      ])
      const f = firmaSticker({ bot: ajustes.nombre, solicitante: ctx.usuario?.nombre, tipo: 'sonido', segundos: largo, pack: ctx.args.join(' ').trim() })
      const webp = conMetadatos(animacion, f.pack, f.autor, f.emojis)
      const como = await enviarStickerSonido(sock, ctx.jid, webp, audio, largo, { quoted: m })
      if (como === 'separado') await ctx.responder(ok('Mandé el sticker y su audio por separado: esta versión de WhatsApp o del bot aún no recibe stickers con sonido.'))
    } catch (error) {
      console.error(`saudio: ${error.message}`)
      await ctx.responder(mal(`No pude crear el sticker con sonido (•́︵•̀)\n🔎 ${String(error.message).split('\n')[0].slice(0, 120)}`))
    } finally { soltarTurno(ctx.numero) }
  }
}
