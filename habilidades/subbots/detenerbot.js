// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja, mal } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'
import { detenerSubbot, infoSubbot } from '../../nucleo/subbots.js'

export default {
  nombre: 'detenerbot',
  alias: ['dejarbot', 'borrarbot', 'apagarbot'],
  categoria: 'subbots',
  ayuda: 'Apaga tu sub-bot y borra su sesión (con confirmación)',
  soloPrivado: true,
  async ejecutar(sock, m, ctx) {
    if (!infoSubbot(ctx.numero).existe) return ctx.responder(mal(`No tienes un sub-bot activo. Crea uno con ${ctx.prefijo}serbot.`))
    if (!/^(si|sí|confirmar)$/i.test(ctx.args[0] || '')) {
      return conBotones(ctx, caja('¿Detener tu sub-bot?', ['Se cerrará la sesión y se borrarán sus datos.', 'Para volver a tenerlo, deberás vincularlo otra vez con un código.']), [
        { texto: '✅ Sí, detener', cmd: 'detenerbot si' },
        { texto: '↩️ Cancelar', cmd: 'mibot' }
      ])
    }
    try {
      await detenerSubbot(ctx.numero)
      await ctx.responder('🛑 Listo, tu sub-bot se apagó y su sesión se borró. Cuando quieras, vuelve con *' + ctx.prefijo + 'serbot* (•ᴗ•)')
    } catch (error) {
      await ctx.responder(mal(`No pude detenerlo: ${String(error.message).slice(0, 100)}`))
    }
  }
}
