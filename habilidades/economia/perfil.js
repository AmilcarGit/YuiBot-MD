// Código Oficial de YuiBot-MD.by AmilcarGit
import { formato } from '../../nucleo/utiles.js'
import { logros, trabajos } from '../../nucleo/juego.js'

export default {
  nombre: 'perfil',
  alias: ['yo'],
  categoria: 'economia',
  ayuda: 'Muestra tu perfil',
  registro: true,
  async ejecutar(sock, m, ctx) {
    const u = ctx.usuario
    const personajes = Object.values(u.coleccion).reduce((a, b) => a + b, 0)
    const trabajo = trabajos.find(t => t.id === u.trabajo)?.nombre || 'Ninguno'
    const obtenidos = u.logros.map(l => logros[l]).join(', ') || 'Ninguno'

    await ctx.responder([
      `*${u.nombre}*`,
      `Nivel: ${u.nivel}`,
      `XP: ${formato(u.xp)}`,
      `Monedas: ${formato(u.monedas)}`,
      `Mensajes: ${formato(u.mensajes)}`,
      `Racha: ${u.racha} días`,
      `Trabajo: ${trabajo}`,
      `Personajes: ${personajes}`,
      `Logros: ${obtenidos}`
    ].join('\n'))
  }
}
