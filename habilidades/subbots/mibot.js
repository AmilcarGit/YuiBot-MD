// Código Oficial de YuiBot-MD.by AmilcarGit
import { caja } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'
import { cupos, infoSubbot, tiempoActivo } from '../../nucleo/subbots.js'

export default {
  nombre: 'mibot',
  alias: ['misubbot', 'estadobot'],
  categoria: 'subbots',
  ayuda: 'Estado de tu sub-bot: si está conectado y desde cuándo',
  soloPrivado: true,
  async ejecutar(sock, m, ctx) {
    const i = infoSubbot(ctx.numero)
    if (!i.existe) {
      return conBotones(ctx, caja('Tu sub-bot', ['🤖 Todavía no tienes un sub-bot.', `🎟️ Cupos libres: ${cupos().libres}`, '', 'Pídelo y vincúlalo con un código.']), [{ texto: '🤖 Crear sub-bot', cmd: 'serbot' }])
    }
    const lineas = [i.conectado ? '🟢 Conectado' : '🟡 Conectándose… (espera unos segundos)', i.desde && `⏱️ Activo hace ${tiempoActivo(i.desde)}`, `🔢 Número: ${ctx.numero}`, '', `Para apagarlo: ${ctx.prefijo}detenerbot`]
    await conBotones(ctx, caja('Tu sub-bot', lineas), [{ texto: '🛑 Detener', cmd: 'detenerbot' }])
  }
}
