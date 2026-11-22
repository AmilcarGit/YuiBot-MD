// Código Oficial de YuiBot-MD.by AmilcarGit
import ajustes from '../../ajustes.js'
import { listar } from '../../nucleo/cargador.js'
import { enviarLista } from '../../nucleo/interfaz.js'

const titulos = {
  general: 'General',
  economia: 'Economía',
  juegos: 'Juegos',
  grupo: 'Grupo',
  subbots: 'Sub-bots',
  dueno: 'Dueño'
}

export default {
  nombre: 'menu',
  alias: ['grimorio', 'ayuda'],
  categoria: 'general',
  ayuda: 'Muestra el menú de comandos',
  async ejecutar(sock, m, ctx) {
    const visibles = listar().filter(h => !h.soloDueno || ctx.esDueno)
    const categorias = [...new Set(visibles.map(h => h.categoria))]
    const elegida = ctx.args[0]?.toLowerCase()

    if (elegida && categorias.includes(elegida)) {
      const filas = visibles
        .filter(h => h.categoria === elegida)
        .map(h => `• ${ctx.prefijo}${h.nombre} — ${h.ayuda}`)
      return ctx.responder([`*${titulos[elegida] || elegida}*`, ...filas].join('\n'))
    }

    await enviarLista(ctx, {
      titulo: ajustes.nombre,
      texto: `Hola ${ctx.usuario.nombre || 'viajero'}, elige una categoría.`,
      pie: `Creado por ${ajustes.creador}`,
      boton: 'Ver categorías',
      secciones: [{
        title: 'Categorías',
        rows: categorias.map(c => ({
          title: titulos[c] || c,
          rowId: `${ctx.prefijo}menu ${c}`,
          description: `${visibles.filter(h => h.categoria === c).length} comandos`
        }))
      }]
    })
  }
}
