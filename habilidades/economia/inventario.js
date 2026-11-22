// Código Oficial de YuiBot-MD.by AmilcarGit
import { tienda } from '../../nucleo/juego.js'

export default {
  nombre: 'inventario',
  alias: ['inv'],
  categoria: 'economia',
  ayuda: 'Tus objetos y personajes',
  registro: true,
  async ejecutar(sock, m, ctx) {
    const u = ctx.usuario
    const objetos = Object.keys(u.inventario).map(id => tienda.find(t => t.id === id)?.nombre || id)
    const personajes = Object.entries(u.coleccion).map(([nombre, cantidad]) => `${nombre} x${cantidad}`)

    await ctx.responder([
      '*Objetos*',
      objetos.join(', ') || 'Ninguno',
      '*Personajes*',
      personajes.join(', ') || 'Ninguno'
    ].join('\n'))
  }
}
