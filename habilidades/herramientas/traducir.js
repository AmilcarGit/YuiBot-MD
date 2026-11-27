// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'
import { IDIOMAS, codigoIdioma, recordarTexto, textoGuardado, traducir } from '../../nucleo/herramientas.js'
import { extraerTexto } from '../../nucleo/utiles.js'

const BANDERAS = { es: '🇪🇸', en: '🇬🇧', pt: '🇧🇷', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹', ja: '🇯🇵', ko: '🇰🇷', zh: '🇨🇳', ru: '🇷🇺', ar: '🇸🇦', hi: '🇮🇳', tr: '🇹🇷', nl: '🇳🇱', la: '🏛️' }
const MAS = ['fr', 'de', 'it', 'ja', 'ko', 'zh', 'ru', 'ar', 'hi', 'tr', 'nl', 'la']

const citado = m => {
  const c = m?.message
  const info = c && Object.values(c.ephemeralMessage?.message || c).map(v => v?.contextInfo).find(Boolean)
  return info?.quotedMessage ? extraerTexto({ message: info.quotedMessage }) : ''
}

export default {
  nombre: 'traducir',
  alias: ['tr', 'translate', 'traduce'],
  categoria: 'herramientas',
  ayuda: 'Traduce con botones de idioma: .traducir en hola amigos · o responde a un mensaje con .traducir es',
  async ejecutar(sock, m, ctx) {
    const [primero, ...resto] = ctx.args
    const idioma = codigoIdioma(primero)
    // El texto viene escrito, de un mensaje al que se responde, o del último que se tradujo (así funcionan los botones).
    const texto = ((idioma ? resto.join(' ') : ctx.args.join(' ')).trim() || citado(m) || (idioma ? textoGuardado(ctx.numero) : '')).slice(0, 1500)
    if (!texto) return ctx.responder(mal(`Uso: ${ctx.prefijo}traducir en hola, ¿cómo estás?\nO responde a un mensaje con ${ctx.prefijo}traducir es\nIdiomas: ${Object.keys(IDIOMAS).slice(0, 14).join(', ')}…`))
    const destino = idioma || 'es'
    try {
      const r = await traducir(texto, destino)
      recordarTexto(ctx.numero, texto)
      const rapidos = ['en', 'es', 'pt', 'fr'].filter(c => c !== destino).slice(0, 2)
      const botones = [
        ...rapidos.map(c => ({ texto: `${BANDERAS[c]} ${IDIOMAS[c]}`, cmd: `traducir ${c}` })),
        { texto: '🌐 Más idiomas', secciones: [{ titulo: 'Traducir a…', filas: MAS.filter(c => c !== destino).map(c => ({ titulo: `${BANDERAS[c]} ${IDIOMAS[c]}`, descripcion: `Traducir el mismo texto a ${IDIOMAS[c].toLowerCase()}`, cmd: `traducir ${c}` })) }] }
      ]
      await conBotones(ctx, caja('Traductor', [`🌐 ${r.origen ? `${IDIOMAS[r.origen] || r.origen} ➜ ` : '➜ '}${BANDERAS[destino] || ''} ${IDIOMAS[destino]}`, '', r.traduccion, '', '👇 Toca un idioma para traducir lo mismo']), botones)
    } catch (error) {
      console.error(`traducir: ${error.message}`)
      await ctx.responder(mal('No pude traducir ahora mismo (•́︵•̀) Intenta de nuevo en un momento.'))
    }
  }
}
