// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { codigoMoneda, convertir } from '../../nucleo/herramientas.js'

export default {
  nombre: 'cambio',
  alias: ['divisa', 'divisas', 'moneda-cambio', 'dolar'],
  categoria: 'herramientas',
  ayuda: 'Convierte monedas: .cambio 100 usd pen · .cambio 50 eur soles',
  async ejecutar(sock, m, ctx) {
    // .dolar (sin más): cuánto vale 1 dólar en soles; .dolar 50 también funciona.
    const comoDolar = /^\S?dolar\b/i.test(String(ctx.texto || '').trim())
    const [c, de, a] = comoDolar && ctx.args.length < 2 ? [ctx.args[0] || '1', 'usd', 'pen'] : ctx.args
    const cantidad = Number(String(c || '').replace(',', '.'))
    const origen = codigoMoneda(de)
    const destino = codigoMoneda(a)
    if (!Number.isFinite(cantidad) || cantidad <= 0 || !origen || !destino) return ctx.responder(mal(`Uso: ${ctx.prefijo}cambio 100 usd pen\nTambién con nombres: dólar, euro, soles, pesos…`))
    try {
      const r = await convertir(cantidad, origen, destino)
      const f = n => n.toLocaleString('es-PE', { maximumFractionDigits: n < 1 ? 6 : 2 })
      await ctx.responder(caja('Cambio de moneda', [`💱 ${f(cantidad)} ${origen} =`, `✅ *${f(r.resultado)} ${destino}*`, `📈 1 ${origen} = ${f(r.tasa)} ${destino}`, r.actualizado && `🕒 ${r.actualizado.slice(0, 16)} UTC`]))
    } catch (error) { await ctx.responder(mal(/conozco/.test(error.message) ? error.message : 'No pude consultar el cambio ahora mismo (•́︵•̀)')) }
  }
}
