// Código Oficial de YuiBot-MD.by AmilcarGit
import { tienda } from '../../nucleo/juego.js'
import { caja, temaActivo } from '../../estilo/index.js'

export default {
  nombre: 'inventario',
  alias: ['inv'],
  categoria: 'economia',
  ayuda: 'Tus objetos y personajes',
  registro: true,
  async ejecutar(sock, m, ctx) {
    const u = ctx.usuario
    const e = temaActivo().emojis
    const objetos = Object.keys(u.inventario).map(id => tienda.find(t => t.id === id)?.nombre || id)
    const personajes = Object.entries(u.coleccion).map(([nombre, cantidad]) => `${nombre} x${cantidad}`)

    await ctx.responder(caja('Inventario', [
      `${e.regalo} Objetos`,
      ...(objetos.length ? objetos.map(o => `${e.item} ${o}`) : ['Todavía nada']),
      '',
      `${e.persona} Personajes`,
      ...(personajes.length ? personajes.map(p => `${e.item} ${p}`) : ['Todavía nadie'])
    ]))
  }
}
