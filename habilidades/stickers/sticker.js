// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../../ajustes.js'
import { mal } from '../../estilo/index.js'
import { aWebp, conMetadatos, firmaSticker, duracion, hayFfmpeg, SEG_MAX } from '../../nucleo/stickers.js'
import { buscarMedio, descargar, soltarTurno, tomarTurno } from './_comun.js'

const MAX_MB = 12

export default {
  nombre: 'sticker',
  alias: ['s', 'stiker', 'stick'],
  categoria: 'stickers',
  ayuda: 'Crea un sticker: responde a una imagen, GIF o video con .s (opciones: recorte, o nombre|autor)',
  async ejecutar(sock, m, ctx) {
    if (!(await hayFfmpeg())) return ctx.responder(mal('Falta ffmpeg en el servidor del bot para crear stickers.'))
    const medio = buscarMedio(m, ctx.jid)
    if (!medio || medio.tipo === 'audioMessage') {
      return ctx.responder(mal(`Responde a una imagen, GIF o video con ${ctx.prefijo}s (o mándalo con ese texto).\nOpciones: ${ctx.prefijo}s recorte · ${ctx.prefijo}s Nombre | Autor`))
    }
    if (!tomarTurno(ctx.numero)) return ctx.responder(mal('Una a la vez, ¿sí? Termino el sticker anterior y sigo contigo.'))
    try {
      const texto = ctx.args.join(' ')
      const recorte = /\b(recorte|crop|llenar)\b/i.test(texto)
      const [pack, autor] = texto.replace(/\b(recorte|crop|llenar)\b/gi, '').split('|').map(x => x.trim())
      const mime = String(medio.nodo.mimetype || '')
      const esVideo = medio.tipo === 'videoMessage' || /^video\//.test(mime) || /gif/.test(mime) || medio.nodo.isAnimated === true
      if (Number(medio.nodo.fileLength) > MAX_MB * 1024 * 1024) return ctx.responder(mal(`Ese archivo pesa demasiado (máximo ${MAX_MB} MB).`))
      if (esVideo && Number(medio.nodo.seconds) > 30) return ctx.responder(mal('Ese video es muy largo. Usa uno de hasta 30 segundos; yo tomo los primeros ' + SEG_MAX + '.'))
      await ctx.responder('🌸 Preparando tu sticker…')
      const buffer = await descargar(sock, medio)
      const largo = esVideo ? await duracion(buffer) : null
      const webp = await aWebp(buffer, { animado: esVideo, modo: recorte ? 'recorte' : 'completo', segundos: Math.min(SEG_MAX, largo || SEG_MAX) })
      const f = firmaSticker({ bot: ajustes.nombre, solicitante: ctx.usuario?.nombre, tipo: esVideo ? 'animado' : 'sticker', segundos: esVideo ? Math.min(SEG_MAX, largo || SEG_MAX) : null, pack, autor })
      const listo = conMetadatos(webp, f.pack, f.autor, f.emojis)
      await ctx.enviar({ sticker: listo }, { quoted: m })
    } catch (error) {
      console.error(`sticker: ${error.message}`)
      await ctx.responder(mal(`No pude crear el sticker (•́︵•̀)\n🔎 ${String(error.message).split('\n')[0].slice(0, 120)}`))
    } finally { soltarTurno(ctx.numero) }
  }
}
