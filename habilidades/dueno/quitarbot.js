// Código Oficial de YuiBot-MD.by AmilcarGit
import { mal } from '../../estilo/index.js'
import { NUMERO_VALIDO, detenerSubbot } from '../../nucleo/subbots.js'

export default {
  nombre: 'quitarbot',
  alias: ['expulsarbot', 'bajarbot'],
  categoria: 'dueno',
  ayuda: 'Apaga y borra el sub-bot de un número: .quitarbot 51999999999',
  soloDueno: true,
  async ejecutar(sock, m, ctx) {
    const numero = String(ctx.args[0] || '').replace(/\D/g, '')
    if (!NUMERO_VALIDO.test(numero)) return ctx.responder(mal(`Dime el número del sub-bot: ${ctx.prefijo}quitarbot 51999999999`))
    try {
      const hecho = await detenerSubbot(numero)
      await ctx.responder(hecho ? `🛑 Sub-bot ${numero} apagado y su sesión borrada.` : mal(`${numero} no tiene sub-bot.`))
    } catch (error) {
      await ctx.responder(mal(`No pude quitarlo: ${String(error.message).slice(0, 100)}`))
    }
  }
}
