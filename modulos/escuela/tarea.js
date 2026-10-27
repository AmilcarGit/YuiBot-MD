// .tarea — tareas escolares interactivas: lista desplegable, botones,
// avisos automáticos antes de la entrega y resumen diario opcional.
const { caja } = require('../../lib/estilo')
const { interpretarFecha, formatearFechaPeru } = require('../../lib/fechas')
const { enviarConRespaldo } = require('../../lib/whatsapp/interactivos')
const recordatorios = require('../../lib/recordatorios')
const resumenDiario = require('../../lib/resumenDiario')
const escuela = require('../../lib/escuela')
const ui = require('../../lib/tareasUI')

const MIN = 60000
// La entrega es a las 23:59: avisamos el día anterior a las 18:00 y el mismo día a las 7:00.
const AVISOS = [
  { antes: (29 * 60 + 59) * MIN, etiqueta: 'mañana' },
  { antes: (16 * 60 + 59) * MIN, etiqueta: 'HOY' },
]

function entrega(texto) {
  if (!texto) return null
  const fecha = interpretarFecha(`${texto.trim()} 23:59`)
  return fecha ? fecha.getTime() : null
}

function crearAvisos({ idBot, numero, tarea, P, ahora = Date.now() }) {
  if (!tarea.entrega) return []
  const ids = []
  for (const a of AVISOS) {
    const cuando = tarea.entrega - a.antes
    if (cuando <= ahora) continue
    try {
      const r = recordatorios.crear({
        idBot, jid: `${numero}@s.whatsapp.net`, numero, cuando,
        texto: `📚 Entrega *${a.etiqueta}*: *${tarea.materia}* — ${tarea.texto}`,
        botones: [{ text: '✅ Completar', id: `${P}tarea completar #${tarea.id}` }, { text: '📋 Mis tareas', id: `${P}tarea lista` }],
      })
      ids.push(r.id)
    } catch { /* límite de recordatorios: la tarea igual se guarda */ }
  }
  return ids
}

function cancelarAvisos(numero, tarea) {
  for (const id of tarea.avisos || []) recordatorios.borrar(numero, id)
}

async function reaccionar(sock, msg, emoji) {
  try { await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } }) } catch { /* no es crítico */ }
}

module.exports = {
  name: 'tarea',
  aliases: ['tareas', 'task'],
  description: 'Tus tareas con lista, botones y avisos: tarea agregar Mate - Ejercicios | 20/11',
  category: 'escuela',

  async execute(sock, msg, args, { config, esSubBot, subbotNumero }) {
    const jid = msg.key.remoteJid
    const P = config.PREFIXES[0]
    const pie = config.BOT_NAME || 'YuiBot-MD'
    const responder = (text) => sock.sendMessage(jid, { text }, { quoted: msg })
    const numero = escuela.numeroUsuario(msg)
    const idBot = esSubBot ? String(subbotNumero) : 'principal'
    const datos = escuela.abrir(numero)
    const tareas = datos.ficha.tareas
    const accion = (args[0] || '').toLowerCase()
    const ahora = Date.now()

    const enviarLista = async () => {
      if (!tareas.length) return enviarAyuda()
      const texto = ui.textoLista(tareas, ahora)
      const intentos = []
      if (config.MENU_LISTA !== false) intentos.push(['lista', { text: texto, footer: pie, buttons: [{ text: '📂 Ver tareas', sections: ui.seccionesLista(tareas, P, ahora) }] }])
      intentos.push(['botones', { text: texto, footer: pie, buttons: ui.botonesRapidos(P) }])
      intentos.push(['texto', { text: texto }])
      return enviarConRespaldo(sock, jid, intentos, { quoted: msg }, 'TAREA')
    }

    const enviarAyuda = () => enviarConRespaldo(sock, jid, [
      ['botones', { text: ui.textoAyuda(P), footer: pie, buttons: [
        { text: '📋 Copiar plantilla', copy: `${P}tarea agregar Materia - Tarea | 20/11` },
        { text: '📋 Mis tareas', id: `${P}tarea lista` },
      ] }],
      ['texto', { text: ui.textoAyuda(P) }],
    ], { quoted: msg }, 'TAREA')

    const enviarDetalle = (t) => enviarConRespaldo(sock, jid, [
      ['botones', { text: ui.textoDetalle(t, ahora), footer: pie, buttons: ui.botonesDetalle(t, P) }],
      ['texto', { text: ui.textoDetalle(t, ahora) }],
    ], { quoted: msg }, 'TAREA')

    if (!args.length || ['lista', 'listar', 'ver', 'mis'].includes(accion) && !args[1]) return enviarLista()

    if (['agregar', 'add', 'nueva'].includes(accion)) {
      if (args.length === 1) return enviarAyuda()
      const [contenido, fechaTexto] = args.slice(1).join(' ').split('|').map((x) => x.trim())
      const partes = (contenido || '').split(/\s+-\s+/)
      if (partes.length < 2 || !partes[0] || !partes.slice(1).join(' - ').trim()) {
        return responder(`❌ Separa la materia y la tarea con " - ".\n\n📌 Ejemplo: ${P}tarea agregar Matemática - Ejercicios 1 al 10 | 20/11`)
      }
      if (tareas.length >= escuela.LIMITES.tareas) return responder(`❌ Llegaste al máximo de ${escuela.LIMITES.tareas} tareas. Usa ${P}tarea limpiar.`)
      const venc = entrega(fechaTexto)
      if (fechaTexto && !venc) return responder('❌ No entendí la fecha. Usa dd/mm (ej. 20/11), hoy o mañana.')
      const tarea = { id: datos.id(), materia: partes[0].slice(0, 40), texto: partes.slice(1).join(' - ').slice(0, 200), hecha: false, entrega: venc, creada: ahora, avisos: [] }
      tarea.avisos = crearAvisos({ idBot, numero, tarea, P, ahora })
      tareas.push(tarea)
      datos.guardar()
      reaccionar(sock, msg, '📝')
      const texto = caja('✅', 'Tarea registrada', [
        ['Materia', tarea.materia, '📚'], ['Tarea', tarea.texto, '📝'],
        venc ? ['Entrega', formatearFechaPeru(new Date(venc)).slice(0, 10), '⏰'] : null,
      ], tarea.avisos.length ? `Te avisaré solo antes de la entrega 🔔 (${tareas.length} en tu lista)` : `${tareas.length} en tu lista`)
      return enviarConRespaldo(sock, jid, [
        ['botones', { text: texto, footer: pie, buttons: ui.botonesDetalle(tarea, P) }],
        ['texto', { text: texto }],
      ], { quoted: msg }, 'TAREA')
    }

    if (['ver', 'detalle'].includes(accion) || ['completar', 'hecha', 'listo', 'done', 'eliminar', 'borrar', 'delete'].includes(accion)) {
      const hallada = ui.buscarTarea(tareas, args[1])
      if (!hallada) return responder(`❌ No encontré esa tarea. Mira ${P}tarea lista`)
      const { tarea, indice } = hallada
      if (['ver', 'detalle'].includes(accion)) return enviarDetalle(tarea)
      if (['completar', 'hecha', 'listo', 'done'].includes(accion)) {
        if (tarea.hecha) return responder(`✅ Esa tarea ya estaba completada: *${tarea.materia}* — ${tarea.texto}`)
        tarea.hecha = true
        cancelarAvisos(numero, tarea)
        tarea.avisos = []
        datos.guardar()
        reaccionar(sock, msg, '✅')
        const faltan = tareas.filter((t) => !t.hecha).length
        return enviarConRespaldo(sock, jid, [
          ['botones', { text: `✅ ¡Bien hecho! Completaste: *${tarea.materia}* — ${tarea.texto}\n${faltan ? `Te quedan ${faltan} pendiente(s).` : '🎉 ¡No te queda ninguna pendiente!'}`, footer: pie, buttons: [{ text: '📋 Mis tareas', id: `${P}tarea lista` }] }],
          ['texto', { text: `✅ ¡Bien hecho! Completaste: *${tarea.materia}* — ${tarea.texto}` }],
        ], { quoted: msg }, 'TAREA')
      }
      tareas.splice(indice, 1)
      cancelarAvisos(numero, tarea)
      datos.guardar()
      return responder(`🗑️ Eliminada: *${tarea.materia}* — ${tarea.texto}`)
    }

    if (['limpiar', 'clear'].includes(accion)) {
      const antes = tareas.length
      datos.ficha.tareas = tareas.filter((t) => !t.hecha)
      datos.guardar()
      return responder(`🧹 Quité ${antes - datos.ficha.tareas.length} tarea(s) completada(s).`)
    }

    if (['resumen', 'diario'].includes(accion)) {
      const sub = (args[1] || '').toLowerCase()
      if (sub === 'ahora') {
        const r = resumenDiario.construirResumen(datos.ficha, ahora, P)
        return r ? enviarConRespaldo(sock, jid, [['botones', { text: r.texto, footer: pie, buttons: r.botones }], ['texto', { text: r.texto }]], { quoted: msg }, 'TAREA') : responder('📭 Hoy no tienes clases, tareas ni exámenes cerca.')
      }
      if (sub === 'off') {
        datos.ficha.resumenDiario = false
        datos.guardar()
        return responder('🔕 Resumen diario desactivado.')
      }
      if (sub === 'on' || !sub) {
        if (sub !== 'on' && datos.ficha.resumenDiario) {
          return enviarConRespaldo(sock, jid, [
            ['botones', { text: '🔔 Tu resumen diario está *activado* (7:00, por privado).', footer: pie, buttons: [{ text: '🔕 Desactivar', id: `${P}tarea resumen off` }, { text: '👀 Ver ahora', id: `${P}tarea resumen ahora` }] }],
            ['texto', { text: `🔔 Tu resumen diario está activado. Desactívalo con ${P}tarea resumen off` }],
          ], { quoted: msg }, 'TAREA')
        }
        datos.ficha.resumenDiario = true
        datos.ficha.resumenBot = idBot
        datos.guardar()
        return responder(`🔔 ¡Listo! Cada mañana a las 7:00 te enviaré por privado tus clases, tareas pendientes y exámenes de la semana.\n\n📌 Pruébalo ahora: ${P}tarea resumen ahora\n🔕 Desactívalo: ${P}tarea resumen off\n\n_Escríbeme por privado una vez si nunca hablamos, para que pueda enviarte el aviso._`)
      }
    }

    return responder(`❌ No conozco "${accion}". Usa ${P}tarea para ver las opciones.`)
  },
  _internos: { entrega, crearAvisos, AVISOS },
}
