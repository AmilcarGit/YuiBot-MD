// Código Oficial de YuiBot-MD.by AmilcarGit
import { api, activa } from '../../nucleo/api.js'
import { todosUsuarios } from '../../nucleo/memoria.js'
import { formato } from '../../nucleo/utiles.js'

async function remoto() {
  if (!activa()) return null
  try {
    const datos = await api.top()
    const lista = Array.isArray(datos) ? datos : datos?.top
    return Array.isArray(lista) && lista.length ? lista : null
  } catch {
    return null
  }
}

export default {
  nombre: 'top',
  alias: ['ranking'],
  categoria: 'economia',
  ayuda: 'Ranking de jugadores',
  async ejecutar(sock, m, ctx) {
    const lista = (await remoto()) ?? Object.values(todosUsuarios())
      .filter(u => u.registrado)
      .sort((a, b) => b.xp - a.xp)

    if (!lista.length) return ctx.responder('Aún no hay jugadores.')

    const filas = lista.slice(0, 10).map((u, i) =>
      `${i + 1}. ${u.nombre || 'Jugador'} — nivel ${u.nivel ?? '-'} · ${formato(u.xp ?? 0)} XP`
    )
    await ctx.responder(['*Top jugadores*', ...filas].join('\n'))
  }
}
