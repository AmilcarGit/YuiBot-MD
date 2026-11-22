// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../../ajustes.js'
import { listar } from '../../nucleo/cargador.js'
import { caja, dice, firma, nieve, temaActivo } from '../../estilo/index.js'

const titulos = {
  general: 'General',
  economia: 'Economía',
  juegos: 'Juegos',
  grupo: 'Grupo',
  subbots: 'Sub-bots',
  dueno: 'Dueño'
}

const orden = Object.keys(titulos)
const posicion = c => (orden.includes(c) ? orden.indexOf(c) : orden.length)

export default {
  nombre: 'menu',
  alias: ['grimorio', 'ayuda'],
  categoria: 'general',
  ayuda: 'Muestra todos los comandos',
  async ejecutar(sock, m, ctx) {
    const tema = temaActivo()
    const visibles = listar().filter(h => !h.soloDueno || ctx.esDueno)
    const porCategoria = new Map()
    for (const h of visibles) {
      if (!porCategoria.has(h.categoria)) porCategoria.set(h.categoria, [])
      porCategoria.get(h.categoria).push(h)
    }

    const elegida = ctx.args[0]?.toLowerCase()
    const unica = elegida && porCategoria.has(elegida)
    const claves = [...porCategoria.keys()].sort((a, b) => posicion(a) - posicion(b))

    const cabecera = caja(ajustes.nombre, [
      dice('saludo', { nombre: ctx.usuario.nombre || 'viajero' }),
      '',
      `${tema.emojis.item} Prefijo: ${ctx.prefijo}`,
      `${tema.emojis.item} Comandos: ${visibles.length}`,
      `${tema.emojis.item} Estilo: ${tema.nombre}`
    ])

    const bloques = (unica ? [elegida] : claves).map(c => caja(
      titulos[c] || c,
      porCategoria.get(c)
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map(h => `${tema.emojis.item} ${ctx.prefijo}${h.nombre} › ${h.ayuda}`),
      { emoji: tema.iconos?.[c] }
    ))

    const consejo = unica
      ? `💡 Usa ${ctx.prefijo}menu para ver todo.`
      : `💡 Usa ${ctx.prefijo}menu categoría para ver solo una.`

    await ctx.responder([nieve(), cabecera, ...bloques, consejo, firma()].join('\n\n'))
  }
}
