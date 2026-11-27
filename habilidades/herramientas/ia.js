// Código Oficial de YuiBot-MD.by AmilcarGit
import { mal } from '../../estilo/index.js'
import { MAX_PREGUNTA, preguntarIA } from '../../nucleo/utilidades.js'
import { extraerTexto } from '../../nucleo/utiles.js'

const ultimo = new Map()
const citado = m => {
  const c = m?.message
  const info = c && Object.values(c.ephemeralMessage?.message || c).map(v => v?.contextInfo).find(Boolean)
  return info?.quotedMessage ? extraerTexto({ message: info.quotedMessage }) : ''
}

export default {
  nombre: 'ia',
  alias: ['yui', 'ai', 'chatgpt', 'pregunta', 'bot'],
  categoria: 'herramientas',
  ayuda: 'Charla con la IA de Yui: .ia ¿por qué el cielo es azul? (o responde a un mensaje con .ia)',
  async ejecutar(sock, m, ctx) {
    const propio = ctx.args.join(' ').trim()
    const previo = citado(m).trim()
    const pregunta = propio && previo ? `${propio}\n\n(Mensaje citado: ${previo.slice(0, 300)})` : propio || previo
    if (!pregunta) return ctx.responder(mal(`¿Qué quieres preguntarme? ${ctx.prefijo}ia cuéntame un dato curioso\nO responde a un mensaje con ${ctx.prefijo}ia.`))
    if (pregunta.length > MAX_PREGUNTA) return ctx.responder(mal(`Tu pregunta es muy larga (máximo ${MAX_PREGUNTA} letras, tiene ${pregunta.length}).`))
    const antes = ultimo.get(ctx.numero) || 0
    if (Date.now() - antes < 6000) return ctx.responder(mal('Un momentito entre pregunta y pregunta (>﹏<)'))
    ultimo.set(ctx.numero, Date.now())
    try {
      await ctx.responder(`✨ ${pregunta.length > 60 ? 'Pensando…' : 'Déjame pensar…'}`).catch(() => {})
      const r = await preguntarIA(pregunta)
      await ctx.responder(`🎀 ${r}`)
    } catch (error) {
      console.error(`ia: ${error.message}`)
      ultimo.delete(ctx.numero)
      await ctx.responder(mal('Mi cerebro de IA no responde ahora mismo (•́︵•̀) Prueba de nuevo en un rato.'))
    }
  }
}
