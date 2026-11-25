// Código Oficial de YuiBot-MD.by AmilcarGit
import { formato, tiempo } from '../../nucleo/utiles.js'
import { ganarXp, logro } from '../../nucleo/juego.js'
import { caja, dice, mal, temaActivo } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'

const DIA = 86400000

export default {
  nombre: 'daily',
  alias: ['diario'],
  categoria: 'economia',
  ayuda: 'Recompensa diaria con racha',
  registro: true,
  async ejecutar(sock, m, ctx) {
    const u = ctx.usuario
    const ahora = Date.now()
    const falta = u.ultimoDaily + DIA - ahora
    if (falta > 0) return ctx.responder(mal(dice('dailyEspera', { tiempo: tiempo(falta), nombre: u.nombre })))

    u.racha = ahora - u.ultimoDaily < DIA * 2 ? u.racha + 1 : 1
    u.ultimoDaily = ahora

    const premio = 500 + Math.min(u.racha, 7) * 50 + (u.inventario.mochila ? 100 : 0)
    u.monedas += premio
    ganarXp(u, 100)

    const e = temaActivo().emojis
    const nuevoLogro = u.racha >= 7 && logro(u, 'racha7')
    await conBotones(ctx, caja('Recompensa diaria', [
      dice('dailyOk', { nombre: u.nombre || 'viajero' }),
      '',
      `${e.dinero} +${formato(premio)} monedas`,
      `${e.racha} Racha: ${u.racha} ${u.racha === 1 ? 'día' : 'días'}`,
      `${e.xp} +100 XP`,
      nuevoLogro && `${e.logro} Logro: Racha de 7 días`
    ]), [{ texto: '💼 Trabajar', cmd: 'trabajar' }, { texto: '🎰 Gacha', cmd: 'gacha' }, { texto: '🛍️ Tienda', cmd: 'tienda' }])
  }
}
