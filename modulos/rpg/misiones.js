//CÓDIGO ORIGINAL DE YUIBOT-MD
const { numeroUsuario, estado, enviarRpg } = require('../../lib/rpg')
const { obtenerUsuario, guardarUsuario, agregarMonedasConBoost } = require('../../lib/db')

function fecha() { return new Date().toISOString().slice(0, 10) }

function crearMisiones() {
  return {
    fecha: fecha(),
    lista: [
      { id: 1, tipo: 'loot', nombre: 'Cazador de tesoros', meta: 2, progreso: 0, recompensa: 120, reclamada: false },
      { id: 2, tipo: 'duelo', nombre: 'Guerrero', meta: 1, progreso: 0, recompensa: 180, reclamada: false },
      { id: 3, tipo: 'boss', nombre: 'Cazador de jefes', meta: 1, progreso: 0, recompensa: 250, reclamada: false },
    ],
  }
}

module.exports = {
  name: 'misiones',
  description: 'Muestra y reclama tus misiones diarias',
  category: 'rpg',
  async execute(sock, msg, args) {
    const numero = numeroUsuario(msg)
    const usuario = obtenerUsuario(numero) || {}
    let misiones = usuario.rpgMisiones
    if (!misiones || misiones.fecha !== fecha()) {
      misiones = crearMisiones()
      guardarUsuario(numero, { rpgMisiones: misiones })
    }
    const accion = String(args?.[0] || '').toLowerCase()
    if (accion === 'reclamar') {
      const id = Number(args?.[1])
      const mision = misiones.lista.find((x) => x.id === id)
      if (!mision) {
        await enviarRpg(sock, msg, { icono: '📜', titulo: 'Misiones', subtitulo: 'Misión no encontrada', datos: ['❌ Usa /misiones para ver las misiones disponibles'], botones: [{ id: '/misiones', text: '📜 VER MISIONES' }] })
        return
      }
      if (mision.reclamada || mision.progreso < mision.meta) {
        await enviarRpg(sock, msg, { icono: '🔒', titulo: 'Misión', subtitulo: mision.reclamada ? 'Recompensa ya reclamada' : 'Aún no está completada', datos: [`📜 ${mision.nombre}`, `📈 ${mision.progreso}/${mision.meta}`, `💰 Recompensa: ${mision.recompensa}`], botones: [{ id: '/misiones', text: '📜 VOLVER' }] })
        return
      }
      mision.reclamada = true
      agregarMonedasConBoost(numero, mision.recompensa)
      guardarUsuario(numero, { rpgMisiones: misiones })
      await enviarRpg(sock, msg, { icono: '🏆', titulo: 'Misión completada', subtitulo: mision.nombre, datos: [`✅ Progreso: ${mision.meta}/${mision.meta}`, `💰 +${mision.recompensa} monedas`, '🎁 Recompensa añadida'], botones: [{ id: '/misiones', text: '📜 MÁS MISIONES' }, { id: '/perfilrpg', text: '🧙 PERFIL' }] })
      return
    }
    const datos = misiones.lista.map((m) => `${m.reclamada ? '✅' : m.progreso >= m.meta ? '🏆' : '📜'} ${m.id}. ${m.nombre} ${m.progreso}/${m.meta}`)
    await enviarRpg(sock, msg, { icono: '📜', titulo: 'Misiones', subtitulo: 'Misiones diarias de YUI RPG', datos, caption: `╭─ ✦ 📜 MISIONES ✦\n│ ${datos.join('\n│ ')}\n╰─ 🍃 Reclama con */misiones reclamar <id>*`, botones: [{ id: '/misiones reclamar 1', text: '📜 MISIÓN 1' }, { id: '/loot', text: '🎁 LOOT' }, { id: '/duelo', text: '⚔️ DUELO' }] })
  },
}
