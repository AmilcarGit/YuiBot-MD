// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { IDIOMAS, codigoIdioma, traducir } from '../../nucleo/herramientas.js'
import { extraerTexto } from '../../nucleo/utiles.js'

const citado = m => {
  const c = m?.message
  const info = c && Object.values(c.ephemeralMessage?.message || c).map(v => v?.contextInfo).find(Boolean)
  return info?.quotedMessage ? extraerTexto({ message: info.quotedMessage }) : ''
}

export default {
  nombre: 'traducir',
  alias: ['tr', 'translate', 'traduce'],
  categoria: 'herramientas',
  ayuda: 'Traduce: .traducir en hola amigos · o responde a un mensaje con .traducir es',
  async ejecutar(sock, m, ctx) {
    const [primero, ...resto] = ctx.args
    const idioma = codigoIdioma(primero)
    const texto = (idioma ? resto.join(' ') : ctx.args.join(' ')).trim() || citado(m)
    if (!texto) return ctx.responder(mal(`Uso: ${ctx.prefijo}traducir en hola, ¿cómo estás?\nO responde a un mensaje con ${ctx.prefijo}traducir es\nIdiomas: ${Object.keys(IDIOMAS).slice(0, 14).join(', ')}…`))
    const destino = idioma || 'es'
    try {
      const r = await traducir(texto, destino)
      await ctx.responder(caja('Traductor', [`🌐 ${IDIOMAS[r.origen] || r.origen || 'Auto'} ➜ ${IDIOMAS[destino]}`, '', r.traduccion]))
    } catch (error) {
      console.error(`traducir: ${error.message}`)
      await ctx.responder(mal('No pude traducir ahora mismo (•́︵•̀) Intenta de nuevo en un momento.'))
    }
  }
}
