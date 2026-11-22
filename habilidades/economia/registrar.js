// Código Oficial de YuiBot-MD.by AmilcarGit
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
