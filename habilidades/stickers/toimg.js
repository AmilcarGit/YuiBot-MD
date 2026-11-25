// Código Oficial de YuiBot-MD.by AmilcarGit
import { mal } from '../../estilo/index.js'
import { aPng, hayFfmpeg } from '../../nucleo/stickers.js'
import { buscarMedio, descargar, soltarTurno, tomarTurno } from './_comun.js'

export default {
  nombre: 'toimg',
  alias: ['aimagen', 'toimage'],
  categoria: 'stickers',
  ayuda: 'Convierte un sticker en imagen: responde al sticker con .toimg',
  async ejecutar(sock, m, ctx) {
    if (!(await hayFfmpeg())) return ctx.responder(mal('Falta ffmpeg en el servidor del bot.'))
    const medio = buscarMedio(m, ctx.jid)
    if (medio?.tipo !== 'stickerMessage') return ctx.responder(mal(`Responde a un sticker con ${ctx.prefijo}toimg.`))
    if (!tomarTurno(ctx.numero)) return ctx.responder(mal('Una a la vez, ¿sí?'))
    try {
      const png = await aPng(await descargar(sock, medio))
      await ctx.enviar({ image: png, caption: '🌸 Aquí tienes tu imagen' }, { quoted: m })
    } catch (error) {
      console.error(`toimg: ${error.message}`)
      await ctx.responder(mal(String(error.message).split('\n')[0].slice(0, 140)))
    } finally { soltarTurno(ctx.numero) }
  }
}
