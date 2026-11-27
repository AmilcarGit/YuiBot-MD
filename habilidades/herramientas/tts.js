// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { MAX_TTS, bajar, textoAVoz } from '../../nucleo/delirius.js'
import { codigoIdioma } from '../../nucleo/herramientas.js'
import { aOpus } from '../../nucleo/stickers.js'
import { extraerTexto } from '../../nucleo/utiles.js'

const citado = m => {
  const c = m?.message
  const info = c && Object.values(c.ephemeralMessage?.message || c).map(v => v?.contextInfo).find(Boolean)
  return info?.quotedMessage ? extraerTexto({ message: info.quotedMessage }) : ''
}

export default {
  nombre: 'tts',
  alias: ['voz', 'texto-a-voz', 'hablar', 'decir'],
  categoria: 'herramientas',
  ayuda: 'Texto a voz (nota de voz): .tts hola amigos · .tts en hello · o responde a un mensaje con .tts',
  async ejecutar(sock, m, ctx) {
    const idioma = codigoIdioma(ctx.args[0])
    const escrito = (idioma ? ctx.args.slice(1) : ctx.args).join(' ').trim()
    const texto = (escrito || citado(m)).replace(/\s+/g, ' ').trim()
    if (!texto) return ctx.responder(mal(`¿Qué quieres que diga? ${ctx.prefijo}tts hola, soy Yui\nOtro idioma: ${ctx.prefijo}tts en good morning\nO responde a un mensaje con ${ctx.prefijo}tts`))
    if (texto.length > MAX_TTS) return ctx.responder(mal(`Ese texto es largo para una nota de voz (máximo ${MAX_TTS} letras, tienes ${texto.length}).`))
    try {
      const url = await textoAVoz(texto, (idioma || 'es').replace('zh-cn', 'zh'))
      const mp3 = await bajar(url, 4 * 1024 * 1024)
      if (ctx.web) return await ctx.enviar({ audio: mp3, mimetype: 'audio/mpeg' }, { quoted: m })
      // Nota de voz de verdad (Opus); si no hay ffmpeg, va como audio normal.
      try { return await ctx.enviar({ audio: await aOpus(mp3, 60), mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m }) } catch (error) { console.error(`tts opus: ${error.message}`) }
      await ctx.enviar({ audio: mp3, mimetype: 'audio/mpeg' }, { quoted: m })
    } catch (error) {
      console.error(`tts: ${error.message}`)
      await ctx.responder(mal('No pude convertir ese texto en voz ahora mismo (•́︵•̀) Intenta de nuevo.'))
    }
  }
}
