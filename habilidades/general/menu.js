// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../../ajustes.js'
import { listar } from '../../nucleo/cargador.js'

const categorias = {
  general: ['⚙️', 'General'],
  economia: ['💰', 'Economía'],
  juegos: ['🎮', 'Juegos'],
  grupo: ['👥', 'Grupo'],
  subbots: ['🤖', 'Sub-bots'],
  dueno: ['👑', 'Dueño']
}

const orden = Object.keys(categorias)

const posicion = c => (orden.includes(c) ? orden.indexOf(c) : orden.length)

function bloque(clave, comandos, prefijo) {
  const [icono, titulo] = categorias[clave] || ['📌', clave]
  const filas = comandos
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .map(h => `│ ✦ *${prefijo}${h.nombre}* › ${h.ayuda}`)
  return [`╭─〔 ${icono} *${titulo}* 〕`, ...filas, '╰──────────────'].join('\n')
}

export default {
  nombre: 'menu',
  alias: ['grimorio', 'ayuda'],
  categoria: 'general',
  ayuda: 'Muestra todos los comandos',
  async ejecutar(sock, m, ctx) {
    const visibles = listar().filter(h => !h.soloDueno || ctx.esDueno)
    const porCategoria = new Map()
    for (const h of visibles) {
      if (!porCategoria.has(h.categoria)) porCategoria.set(h.categoria, [])
      porCategoria.get(h.categoria).push(h)
    }

    const elegida = ctx.args[0]?.toLowerCase()
    const claves = [...porCategoria.keys()].sort((a, b) => posicion(a) - posicion(b))
    const mostrar = elegida && porCategoria.has(elegida) ? [elegida] : claves

    const cabecera = [
      `╭━━━〔 ✨ *${ajustes.nombre}* ✨ 〕━━━⬣`,
      `┃ 👋 Hola, *${ctx.usuario.nombre || 'viajero'}*`,
      `┃ 🔰 Prefijo: *${ctx.prefijo}*`,
      `┃ 📜 Comandos: *${visibles.length}*`,
      '╰━━━━━━━━━━━━━━━━━━━━⬣'
    ].join('\n')

    const cuerpo = mostrar.map(c => bloque(c, porCategoria.get(c), ctx.prefijo))
    const pie = elegida && porCategoria.has(elegida)
      ? `💡 Usa *${ctx.prefijo}menu* para ver todo.`
      : `💡 Usa *${ctx.prefijo}menu <categoría>* para ver solo una.\n👨‍💻 Creado por ${ajustes.creador}`

    await ctx.responder([cabecera, ...cuerpo, pie].join('\n\n'))
  }
}
