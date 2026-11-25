// Código Oficial de YuiBot-MD.by AmilcarGit
import { mal } from '../../estilo/index.js'
import { aMp3, hayFfmpeg } from '../../nucleo/stickers.js'
import { buscarMedio, descargar, soltarTurno, tomarTurno } from '../stickers/_comun.js'

export default {
  nombre: 'tomp3',
  alias: ['toaudio', 'amp3'],
  categoria: 'general',
  ayuda: 'Saca el audio de un video o nota de voz en MP3: responde con .tomp3',
  async ejecutar(sock, m, ctx) {
    if (!(await hayFfmpeg())) return ctx.responder(mal('Falta ffmpeg en el servidor del bot.'))
    const medio = buscarMedio(m, ctx.jid)
    if (!medio || !['videoMessage', 'audioMessage', 'documentMessage'].includes(medio.tipo)) {
      return ctx.responder(mal(`Responde a un video o a un audio con ${ctx.prefijo}tomp3.`))
    }
    if (Number(medio.nodo.fileLength) > 40 * 1024 * 1024) return ctx.responder(mal('Ese archivo pesa demasiado (máximo 40 MB).'))
    if (!tomarTurno(ctx.numero)) return ctx.responder(mal('Una a la vez, ¿sí?'))
    try {
      await ctx.responder('🎧 Convirtiendo a MP3…')
      const mp3 = await aMp3(await descargar(sock, medio))
      await ctx.enviar({ audio: mp3, mimetype: 'audio/mpeg', ptt: false }, { quoted: m })
    } catch (error) {
      console.error(`tomp3: ${error.message}`)
      await ctx.responder(mal(`No pude convertirlo (•́︵•̀)\n🔎 ${String(error.message).split('\n')[0].slice(0, 120)}`))
    } finally { soltarTurno(ctx.numero) }
  }
}
