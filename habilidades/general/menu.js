// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../../ajustes.js'
import { listar } from '../../nucleo/cargador.js'
import { caja, dice, firma, fuente, nieve, temaActivo } from '../../estilo/index.js'
import { conBotones } from '../../nucleo/botones.js'
import { formato } from '../../nucleo/utiles.js'
import { ZONA } from '../../estilo/temas.js'

const titulos = {
  general: 'General',
  economia: 'Economía',
  juegos: 'Juegos',
  descargas: 'Descargas',
  herramientas: 'Herramientas',
  stickers: 'Stickers',
  grupo: 'Grupo',
  subbots: 'Sub-bots',
  dueno: 'Dueño'
}

const orden = Object.keys(titulos)
const posicion = c => (orden.includes(c) ? orden.indexOf(c) : orden.length)

/** Barra de progreso hacia el siguiente nivel (nivel = √(xp/10) + 1, igual que en nucleo/juego.js). */
function progreso(xp, nivel, largo = 8) {
  const desde = 10 * (nivel - 1) ** 2; const hasta = 10 * nivel ** 2
  const p = Math.min(1, Math.max(0, (xp - desde) / (hasta - desde || 1)))
  const llenos = Math.round(p * largo)
  return { barra: '▰'.repeat(llenos) + '▱'.repeat(largo - llenos), porcentaje: Math.round(p * 100) }
}

/** Menú corto (con botones): una tarjeta con los datos de quien lo pidió; los comandos van en el desplegable. */
export function menuCompacto({ tema, nombre, prefijo, total, categorias, usuario = {}, ahora = new Date(), zona = ZONA }) {
  const t = tema.emojis
  const linea = '━━━━━━━━━━━━━━━━━━'
  const n = Number.isFinite(usuario.nivel) ? usuario.nivel : null
  const xp = Number.isFinite(usuario.xp) ? usuario.xp : 0
  const { barra, porcentaje } = n ? progreso(xp, n) : {}
  const fecha = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short', timeZone: zona }).format(ahora).replace(/\./g, '')
  const hora = new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: zona }).format(ahora)
  const chips = categorias.map(c => `${tema.iconos?.[c.clave] || t.item}${c.nombres.length}`)
  const lineasChips = []
  for (let i = 0; i < chips.length; i += 5) lineasChips.push(`┃ ${chips.slice(i, i + 5).join('  ')}`)
  return [
    `╭${linea}╮`,
    `┃  ${t.titulo} ${fuente(ajustes.nombre, tema.fuente)} ${t.titulo}`,
    `┣${linea}┫`,
    `┃ ${t.persona} *${nombre}*`,
    n && `┃ ${t.nivel} Nivel *${n}*  ${barra} ${porcentaje}%`,
    Number.isFinite(usuario.monedas) && `┃ ${t.dinero} ${formato(usuario.monedas)}${usuario.racha ? `  ·  ${t.racha} Racha ${usuario.racha}` : ''}${xp ? `  ·  ${t.xp} ${formato(xp)}` : ''}`,
    `┣${linea}┫`,
    `┃ 📅 ${fecha}  ·  🕒 ${hora}`,
    `┃ ⚙️ Prefijo *${prefijo}*  ·  📚 ${total} comandos`,
    ...lineasChips,
    `╰${linea}╯`,
    '👇 Toca *📜 Comandos* y elige'
  ].filter(Boolean).join('\n')
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
      // WhatsApp admite 10 filas por sección: las categorías largas se parten en partes.
      secciones: mostradas.flatMap(c => {
        const filas = porCategoria.get(c).sort((a, b) => a.nombre.localeCompare(b.nombre)).map(h => ({ titulo: `${ctx.prefijo}${h.nombre}`, descripcion: h.ayuda, cmd: h.nombre }))
        const partes = Math.ceil(filas.length / 10)
        return Array.from({ length: partes }, (_, i) => ({ titulo: `${titulos[c] || c}${partes > 1 ? ` ${i + 1}/${partes}` : ''}`, filas: filas.slice(i * 10, i * 10 + 10) }))
      })
    }

    // Con botones el mensaje es corto y bonito: el detalle de cada comando va en el desplegable.
    if (ctx.botonesActivos) {
      const texto = menuCompacto({ tema, nombre: ctx.usuario.nombre || 'viajero', prefijo: ctx.prefijo, total: visibles.length, usuario: ctx.usuario, categorias: mostradas.map(c => ({ clave: c, titulo: titulos[c] || c, nombres: porCategoria.get(c).map(h => h.nombre).sort() })) })
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
