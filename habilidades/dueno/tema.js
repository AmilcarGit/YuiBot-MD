// Código Oficial de YuiBot-MD.by AmilcarGit
import { temas } from '../../estilo/temas.js'
import { caja, dice, mal, modoActual, ok, temaActivo } from '../../estilo/index.js'
import { chat } from '../../nucleo/memoria.js'

export default {
  nombre: 'tema',
  alias: ['festividad', 'estilo'],
  categoria: 'dueno',
  ayuda: 'Cambia el estilo: auto, normal, navidad...',
  soloDueno: true,
  async ejecutar(sock, m, ctx) {
    const opciones = ['auto', ...Object.keys(temas)]
    const eleccion = ctx.args[0]?.toLowerCase()

    if (!eleccion) {
      const e = temaActivo().emojis
      return ctx.responder(caja('Estilo del bot', [
        `${e.item} Activo: ${temaActivo().nombre}`,
        `${e.item} Modo: ${modoActual()}`,
        `${e.item} Opciones: ${opciones.join(', ')}`,
        '',
        `Cámbialo con ${ctx.prefijo}tema navidad`
      ]))
    }

    if (!opciones.includes(eleccion)) {
      return ctx.responder(mal(dice('temaInvalido', { opciones: opciones.join(', ') })))
    }

    chat('_global').tema = eleccion
    await ctx.responder(ok(dice('temaCambiado', { tema: temaActivo().nombre })))
  }
}
