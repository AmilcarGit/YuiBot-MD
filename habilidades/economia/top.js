// Código Oficial de YuiBot-MD.by AmilcarGit
import { api, activa } from '../../nucleo/api.js'
import { todosUsuarios } from '../../nucleo/memoria.js'
import { formato } from '../../nucleo/utiles.js'
import { aviso, caja, dice, temaActivo } from '../../estilo/index.js'

const medallas = ['🥇', '🥈', '🥉']
const campos = {
  xp: 'XP',
  monedas: 'Monedas',
  semana: 'XP de la semana',
  trabajos: 'Ganado en trabajos'
}

async function remoto(campo) {
  if (!activa()) return null
  try {
    const datos = await api.top(campo, 10)
    return Array.isArray(datos?.top) && datos.top.length ? datos.top : null
  } catch {
    return null
  }
}

export default {
  nombre: 'top',
  alias: ['ranking'],
  categoria: 'economia',
  ayuda: 'Ranking global: top [xp|monedas|semana|trabajos]',
  async ejecutar(sock, m, ctx) {
    const e = temaActivo().emojis
    const pedido = ctx.args[0]?.toLowerCase()
    const campo = campos[pedido] ? pedido : 'xp'

    const global = await remoto(campo)
    if (global) {
      const icono = campo === 'monedas' || campo === 'trabajos' ? e.dinero : e.xp
      const filas = global.map(f => `${medallas[f.pos - 1] || `${f.pos}.`} ${f.visible} · ${icono} ${formato(f.valor)}`)
      return ctx.responder(caja(`Top global · ${campos[campo]}`, [...filas, '', `Uso: ${ctx.prefijo}top xp · monedas · semana · trabajos`]))
    }

    // Sin conexión con Yui-Datos: ranking de este bot.
    const lista = Object.values(todosUsuarios())
      .filter(u => u.registrado)
      .sort((a, b) => b.xp - a.xp)
    if (!lista.length) return ctx.responder(aviso(dice('topVacio')))

    const filas = lista.slice(0, 10).map((u, i) =>
      `${medallas[i] || `${i + 1}.`} ${u.nombre || 'Jugador'} · ${e.nivel} ${u.nivel ?? '-'} · ${e.xp} ${formato(u.xp ?? 0)}`
    )
    await ctx.responder(caja('Top jugadores', filas))
  }
}
