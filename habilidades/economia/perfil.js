// Código Oficial de YuiBot-MD.by AmilcarGit
import { formato } from '../../nucleo/utiles.js'
import { logros, trabajos } from '../../nucleo/juego.js'
import { caja, temaActivo } from '../../estilo/index.js'
import { api, activa } from '../../nucleo/api.js'
import { conBotones } from '../../nucleo/botones.js'

export default {
  nombre: 'perfil',
  alias: ['yo'],
  categoria: 'economia',
  ayuda: 'Muestra tu perfil',
  registro: true,
  async ejecutar(sock, m, ctx) {
    const u = ctx.usuario
    const e = temaActivo().emojis
    const personajes = Object.values(u.coleccion).reduce((a, b) => a + b, 0)
    const trabajo = trabajos.find(t => t.id === u.trabajo)?.nombre || 'Ninguno'
    const obtenidos = u.logros.map(l => logros[l]).join(', ') || 'Ninguno'

    // Posición en el ranking global (si Yui-Datos responde a tiempo; si no, se omite).
    let global = null
    if (activa()) {
      try {
        const datos = await api.usuario(ctx.numero)
        if (datos.existe) global = datos.posiciones
      } catch {}
    }

    await conBotones(ctx, caja('Perfil', [
      `${e.persona} ${u.nombre}`,
      '',
      `${e.nivel} Nivel: ${u.nivel}`,
      `${e.xp} XP: ${formato(u.xp)}`,
      `${e.dinero} Monedas: ${formato(u.monedas)}`,
      `💬 Mensajes: ${formato(u.mensajes)}`,
      `${e.racha} Racha: ${u.racha} ${u.racha === 1 ? 'día' : 'días'}`,
      `${e.trabajo} Trabajo: ${trabajo}`,
      `${e.regalo} Personajes: ${personajes}`,
      `${e.logro} Logros: ${obtenidos}`,
      global?.xp && `🌍 Ranking global: #${global.xp} en XP`
    ]), [{ texto: '🎁 Daily', cmd: 'daily' }, { texto: '💼 Trabajar', cmd: 'trabajar' }, { texto: '🏆 Top', cmd: 'top' }])
  }
}
