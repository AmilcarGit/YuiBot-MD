// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../../ajustes.js'
import { listar } from '../../nucleo/cargador.js'
import { caja, dice, firma, fuente, nieve, temaActivo } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'

const titulos = {
  general: 'General',
  economia: 'Economía',
  juegos: 'Juegos',
  descargas: 'Descargas',
  stickers: 'Stickers',
  grupo: 'Grupo',
  subbots: 'Sub-bots',
  dueno: 'Dueño'
}

const orden = Object.keys(titulos)
const posicion = c => (orden.includes(c) ? orden.indexOf(c) : orden.length)

/** Texto del menú corto (con botones): cabecera, datos y una tarjeta por categoría con 3 comandos de muestra. */
export function menuCompacto({ tema, nombre, prefijo, total, categorias }) {
  const t = tema.emojis
  const linea = '━━━━━━━━━━━━━━━━━━'
  const filas = categorias.map(c => {
    const resto = c.nombres.length > 3 ? ` +${c.nombres.length - 3}` : ''
    return `┃ ${tema.iconos?.[c.clave] || t.item} *${c.titulo}* ‹${c.nombres.length}›\n┃    ${t.item} ${c.nombres.slice(0, 3).join(' · ')}${resto}`
  })
  return [
    `╭${linea}╮`,
    `┃  ${t.titulo} ${fuente(ajustes.nombre, tema.fuente)} ${t.titulo}`,
    `┣${linea}┫`,
    `┃ 👤 ${nombre}`,
    `┃ ⚙️ Prefijo: *${prefijo}*  ·  📚 ${total} comandos`,
    `┣${linea}┫`,
    ...filas,
    `╰${linea}╯`,
    '💡 Toca *📜 Comandos* para ver todos'
  ].join('\n')
}

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

    const mostradas = unica ? [elegida] : claves
    const desplegable = {
      texto: '📜 Comandos',
      secciones: mostradas.map(c => ({
        titulo: titulos[c] || c,
        filas: porCategoria.get(c).sort((a, b) => a.nombre.localeCompare(b.nombre)).map(h => ({ titulo: `${ctx.prefijo}${h.nombre}`, descripcion: h.ayuda, cmd: h.nombre }))
      }))
    }

    // Con botones el mensaje es corto y bonito: el detalle de cada comando va en el desplegable.
    if (ctx.botonesActivos) {
      const texto = menuCompacto({ tema, nombre: ctx.usuario.nombre || 'viajero', prefijo: ctx.prefijo, total: visibles.length, categorias: mostradas.map(c => ({ clave: c, titulo: titulos[c] || c, nombres: porCategoria.get(c).map(h => h.nombre).sort() })) })
      return conBotones(ctx, texto, [desplegable], { media: ajustes.menuMedia })
    }

    const bloques = mostradas.map(c => caja(
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
