// .tarea — tareas escolares guardadas por persona (con fecha de entrega opcional).
const { caja } = require('../../lib/estilo')
const { interpretarFecha, describirDuracion, formatearFechaPeru } = require('../../lib/fechas')
const escuela = require('../../lib/escuela')

function entrega(texto) {
  if (!texto) return null
  const fecha = interpretarFecha(`${texto.trim()} 23:59`)
  return fecha ? fecha.getTime() : null
}

function lineaTarea(t, i, ahora = Date.now()) {
  let extra = ''
  if (t.entrega && !t.hecha) {
    const falta = t.entrega - ahora
    extra = falta < 0 ? ' ⚠️ vencida' : ` ⏰ ${describirDuracion(falta)}`
  }
  return `${t.hecha ? '✅' : '⬜'} ${i + 1}. *${t.materia}* — ${t.texto}${extra}`
}

module.exports = {
  name: 'tarea',
  aliases: ['tareas', 'task'],
  description: 'Tus tareas escolares: tarea agregar Mate - Ejercicios | 20/11',
  category: 'escuela',

  async execute(sock, msg, args, { config }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
    const numero = escuela.numeroUsuario(msg)
    const datos = escuela.abrir(numero)
    const tareas = datos.ficha.tareas
    const accion = (args[0] || '').toLowerCase()

    if (!args.length || ['lista', 'listar', 'ver'].includes(accion)) {
      if (!tareas.length) {
        return responder(caja('📚', 'Tareas', [
          `➕ ${P}tarea agregar <materia> - <tarea> | <dd/mm>`,
          `✅ ${P}tarea completar <n>`,
          `❌ ${P}tarea eliminar <n>`,
          `🧹 ${P}tarea limpiar`,
        ], `Ejemplo: ${P}tarea agregar Matemática - Ejercicios 1 al 10 | 20/11`))
      }
      const pendientes = tareas.filter((t) => !t.hecha).length
      return responder(caja('📋', 'Tus tareas', tareas.map(lineaTarea), `${pendientes} pendiente(s) de ${tareas.length}`))
    }

    if (['agregar', 'add', 'nueva'].includes(accion)) {
      const [contenido, fechaTexto] = args.slice(1).join(' ').split('|').map((x) => x.trim())
      const partes = (contenido || '').split(/\s+-\s+/)
      if (partes.length < 2 || !partes[0] || !partes.slice(1).join(' - ').trim()) {
        return responder(`❌ Separa la materia y la tarea con " - ".\n\n📌 Ejemplo: ${P}tarea agregar Matemática - Ejercicios 1 al 10 | 20/11`)
      }
      if (tareas.length >= escuela.LIMITES.tareas) return responder(`❌ Llegaste al máximo de ${escuela.LIMITES.tareas} tareas. Usa ${P}tarea limpiar.`)
      const venc = entrega(fechaTexto)
      if (fechaTexto && !venc) return responder('❌ No entendí la fecha. Usa dd/mm (ej. 20/11), hoy o mañana.')
      tareas.push({ id: datos.id(), materia: partes[0].slice(0, 40), texto: partes.slice(1).join(' - ').slice(0, 200), hecha: false, entrega: venc, creada: Date.now() })
      datos.guardar()
      return responder(caja('✅', 'Tarea registrada', [['Materia', partes[0], '📚'], ['Tarea', partes.slice(1).join(' - '), '📝'], venc ? ['Entrega', formatearFechaPeru(new Date(venc)).slice(0, 10), '⏰'] : null], `${tareas.length} en tu lista`))
    }

    const n = parseInt(args[1], 10)
    if (['completar', 'hecha', 'listo', 'done', 'eliminar', 'borrar', 'delete'].includes(accion)) {
      if (!n || n < 1 || n > tareas.length) return responder(`❌ Indica el número de la tarea (1 a ${tareas.length || 1}). Mira ${P}tarea lista`)
      if (['completar', 'hecha', 'listo', 'done'].includes(accion)) {
        tareas[n - 1].hecha = true
        datos.guardar()
        return responder(`✅ ¡Bien hecho! Completaste: *${tareas[n - 1].materia}* — ${tareas[n - 1].texto}`)
      }
      const [quitada] = tareas.splice(n - 1, 1)
      datos.guardar()
      return responder(`🗑️ Eliminada: *${quitada.materia}* — ${quitada.texto}`)
    }

    if (['limpiar', 'clear'].includes(accion)) {
      const antes = tareas.length
      datos.ficha.tareas = tareas.filter((t) => !t.hecha)
      datos.guardar()
      return responder(`🧹 Quité ${antes - datos.ficha.tareas.length} tarea(s) completada(s).`)
    }

    return responder(`❌ No conozco "${accion}". Usa ${P}tarea para ver las opciones.`)
  },
  _internos: { entrega, lineaTarea },
}
