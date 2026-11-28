// Código Oficial de YuiBot-MD.by AmilcarGit
// Stickers de texto estilo "brat" (fondo verde, letras borrosas) y animados (attp).
import ajustes from '../../ajustes.js'
import { mal } from '../../estilo/index.js'
import { lienzo } from '../../nucleo/delirius.js'
import { motivo } from '../../nucleo/descargas.js'
import { aWebp, conMetadatos, firmaSticker, hayFfmpeg } from '../../nucleo/stickers.js'

export const MAX_TEXTO = 120
export async function stickerDeTexto(ctx, ruta, animado) {
  const { buffer } = await lienzo(ruta, { text: ctx.args.join(' ').trim() })
  const webp = await aWebp(buffer, { animado, segundos: 6 })
  const f = firmaSticker({ bot: ajustes.nombre, solicitante: ctx.usuario?.nombre, tipo: animado ? 'animado' : 'sticker', segundos: animado ? 6 : null })
  return conMetadatos(webp, f.pack, f.autor, f.emojis)
}

export const crearSticker = ({ nombre, alias, ruta, animado, ayuda }) => ({
  nombre,
  alias,
  categoria: 'stickers',
  ayuda,
  async ejecutar(sock, m, ctx) {
    const texto = ctx.args.join(' ').trim()
    if (!texto) return ctx.responder(mal(`¿Qué texto pongo? ${ctx.prefijo}${nombre} hola, soy Yui`))
    if (texto.length > MAX_TEXTO) return ctx.responder(mal(`Texto muy largo (máximo ${MAX_TEXTO} letras, tiene ${texto.length}).`))
    if (!(await hayFfmpeg())) return ctx.responder(mal('Falta ffmpeg en el servidor del bot para crear stickers.'))
    try {
      await ctx.enviar({ sticker: await stickerDeTexto(ctx, ruta, animado) }, { quoted: m })
    } catch (error) {
      console.error(`${nombre}: ${error.message}`)
      await ctx.responder(mal(`No pude crear ese sticker (•́︵•̀)\n🔎 ${motivo(error)}`))
    }
  }
})

export default crearSticker({ nombre: 'brat', alias: ['bratsticker'], ruta: '/canvas/brat', animado: false, ayuda: 'Sticker de texto estilo brat (verde y borroso): .brat hola, soy Yui' })
