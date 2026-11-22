// Código Oficial de YuiBot-MD.by AmilcarGit
import { api, activa } from '../../nucleo/api.js'

export default {
  nombre: 'registrar',
  alias: ['reg'],
  categoria: 'economia',
  ayuda: 'Crea tu perfil y recibe 300 monedas',
  async ejecutar(sock, m, ctx) {
    const u = ctx.usuario
    if (u.registrado) return ctx.responder('Ya estás registrado.')

    const nombre = ctx.args.join(' ').trim().slice(0, 24)
    if (nombre.length < 2) return ctx.responder(`Uso: ${ctx.prefijo}registrar tuNombre`)

    u.nombre = nombre
    u.registrado = true
    u.monedas += 300

    if (activa()) api.registrar({ id: ctx.numero, nombre }).catch(() => {})
    await ctx.responder(`Registro completo, ${nombre}. Ganaste 300 monedas.`)
  }
}
