// Código Oficial de YuiBot-MD.by AmilcarGit
import { api, activa } from '../../nucleo/api.js'
import { caja, dice, mal, temaActivo } from '../../estilo/index.js'
import { formato } from '../../nucleo/utiles.js'

const BONO = 300

export default {
  nombre: 'registrar',
  alias: ['reg'],
  categoria: 'economia',
  ayuda: `Crea tu perfil y recibe ${BONO} monedas`,
  async ejecutar(sock, m, ctx) {
    const u = ctx.usuario
    if (u.registrado) return ctx.responder(mal(dice('yaRegistrado', { nombre: u.nombre })))

    const nombre = ctx.args.join(' ').trim().slice(0, 24)
    if (nombre.length < 2) return ctx.responder(mal(dice('usoRegistrar', { prefijo: ctx.prefijo })))

    u.nombre = nombre
    u.registrado = true
    u.monedas += BONO

    if (activa()) api.registrar({ id: ctx.numero, nombre }).catch(() => {})
    const e = temaActivo().emojis
    await ctx.responder(caja('Registro completo', [
      dice('registrado', { nombre, monedas: BONO }),
      '',
      `${e.persona} Nombre: ${nombre}`,
      `${e.nivel} Nivel: ${u.nivel}`,
      `${e.dinero} Monedas: ${formato(u.monedas)}`
    ]))
  }
}
