// Código Oficial de YuiBot-MD.by AmilcarGit
import { trabajos, ganarXp, logro } from '../../nucleo/juego.js'
import { aleatorio, formato, tiempo } from '../../nucleo/utiles.js'
import { caja, dice, mal, ok, temaActivo } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'

export default {
  nombre: 'trabajar',
  alias: ['work'],
  categoria: 'economia',
  ayuda: 'Elige un trabajo y cobra',
  registro: true,
  async ejecutar(sock, m, ctx) {
    const u = ctx.usuario
    const e = temaActivo().emojis
    const nombre = u.nombre || 'viajero'
    const elegido = ctx.args[0]?.toLowerCase()

    if (elegido) {
      const nuevo = trabajos.find(t => t.id === elegido)
      if (!nuevo) return ctx.responder(mal(dice('trabajoNoExiste')))
      if (u.nivel < nuevo.nivel) return ctx.responder(mal(dice('trabajoNivel', { nivel: nuevo.nivel, nombre })))
      u.trabajo = nuevo.id
      return ctx.responder(ok(dice('trabajoNuevo', { trabajo: nuevo.nombre })))
    }

    const trabajo = trabajos.find(t => t.id === u.trabajo)
    if (!trabajo) {
      return conBotones(ctx, caja('Oficios', [
        dice('trabajoElige'),
        '',
        ...trabajos.map(t => `${e.trabajo} ${t.id} · nivel ${t.nivel} · ${t.pago[0]}-${t.pago[1]} monedas`),
        '',
        `Uso: ${ctx.prefijo}trabajar oficio`
      ]), [{
        texto: '💼 Elegir oficio',
        secciones: [{
          titulo: 'Oficios',
          filas: trabajos.map(t => ({ titulo: t.nombre || t.id, descripcion: `Nivel ${t.nivel} · ${t.pago[0]}-${t.pago[1]} monedas`, cmd: `trabajar ${t.id}` }))
        }]
      }])
    }

    // El descanso se fija con el oficio que se cobró, así cambiar de oficio no lo salta.
    const falta = u.ultimoTrabajo + (u.esperaTrabajo || trabajo.espera) - Date.now()
    if (falta > 0) return ctx.responder(mal(dice('trabajoEspera', { tiempo: tiempo(falta) })))

    const pago = Math.floor(aleatorio(...trabajo.pago) * (u.inventario.pico ? 1.25 : 1))
    u.monedas += pago
    u.ultimoTrabajo = Date.now()
    u.esperaTrabajo = trabajo.espera
    u.trabajosGanado += pago
    u.veces[trabajo.id] = (u.veces[trabajo.id] || 0) + 1
    ganarXp(u, 50)

    const nuevoLogro = logro(u, 'primerTrabajo')
    await conBotones(ctx, caja('Trabajo', [
      dice('trabajoPago', { trabajo: trabajo.nombre, monto: formato(pago), nombre }),
      '',
      `${e.dinero} +${formato(pago)} monedas`,
      `${e.xp} +50 XP`,
      nuevoLogro && `${e.logro} Logro: Primer trabajo`
    ]), [{ texto: '🪙 Perfil', cmd: 'perfil' }, { texto: '🛍️ Tienda', cmd: 'tienda' }])
  }
}
