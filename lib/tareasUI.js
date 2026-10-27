// Piezas de la interfaz de .tarea: líneas, listas desplegables y botones.
// Se separan del comando para poder probarlas sin WhatsApp.
const { caja, recortar } = require('./estilo')
const { describirDuracion } = require('./fechas')

const DIA_MS = 86400000
const MAX_FILAS_PENDIENTES = 7 // WhatsApp admite 10 filas por lista (7 + 3 acciones)

function estadoEntrega(t, ahora = Date.now()) {
  if (!t.entrega || t.hecha) return { nivel: 'ninguno', texto: '' }
  const falta = t.entrega - ahora
  if (falta < 0) return { nivel: 'vencida', texto: 'vencida' }
  return { nivel: falta < 2 * DIA_MS ? 'urgente' : 'normal', texto: describirDuracion(falta) }
}

function lineaTarea(t, i, ahora = Date.now()) {
  const e = estadoEntrega(t, ahora)
  const extra = e.nivel === 'vencida' ? ' ⚠️ vencida' : e.texto ? ` ⏰ ${e.texto}` : ''
  return `${t.hecha ? '✅' : '⬜'} ${i + 1}. *${t.materia}* — ${t.texto}${extra}`
}

/** Pendientes primero por fecha de entrega (las sin fecha al final). */
function pendientesOrdenadas(tareas) {
  return tareas.filter((t) => !t.hecha).sort((a, b) => (a.entrega || Infinity) - (b.entrega || Infinity))
}

/** "#5" → por id estable · "2" → por posición en la lista. */
function buscarTarea(tareas, ref) {
  const texto = String(ref || '').trim()
  if (/^#\d+$/.test(texto)) {
    const id = Number(texto.slice(1))
    const indice = tareas.findIndex((t) => t.id === id)
    return indice === -1 ? null : { tarea: tareas[indice], indice }
  }
  const n = parseInt(texto, 10)
  if (!/^\d+$/.test(texto) || n < 1 || n > tareas.length) return null
  return { tarea: tareas[n - 1], indice: n - 1 }
}

function seccionesLista(tareas, P, ahora = Date.now()) {
  const filas = pendientesOrdenadas(tareas).slice(0, MAX_FILAS_PENDIENTES).map((t) => {
    const e = estadoEntrega(t, ahora)
    const icono = e.nivel === 'vencida' ? '⚠️' : e.nivel === 'urgente' ? '⏰' : '📌'
    return {
      title: recortar(`${icono} ${t.materia}`, 24),
      description: recortar(`${t.texto}${e.texto ? ` · ${e.nivel === 'vencida' ? 'vencida' : e.texto}` : ''}`, 72),
      id: `${P}tarea ver #${t.id}`,
    }
  })
  const secciones = []
  if (filas.length) secciones.push({ title: '📌 Pendientes', rows: filas })
  secciones.push({
    title: '⚙️ Acciones',
    rows: [
      { title: '➕ Agregar tarea', description: 'Te muestro cómo escribirla', id: `${P}tarea agregar` },
      { title: '🧹 Limpiar hechas', description: 'Quita las tareas completadas', id: `${P}tarea limpiar` },
      { title: '🔔 Resumen diario', description: 'Aviso cada mañana a las 7:00', id: `${P}tarea resumen` },
    ],
  })
  return secciones
}

function botonesRapidos(P) {
  return [
    { text: '➕ Agregar', id: `${P}tarea agregar` },
    { text: '🧹 Limpiar hechas', id: `${P}tarea limpiar` },
    { text: '🔔 Resumen diario', id: `${P}tarea resumen` },
  ]
}

function botonesDetalle(t, P) {
  const botones = []
  if (!t.hecha) botones.push({ text: '✅ Completar', id: `${P}tarea completar #${t.id}` })
  botones.push({ text: '🗑️ Eliminar', id: `${P}tarea eliminar #${t.id}` })
  botones.push({ text: '📋 Mis tareas', id: `${P}tarea lista` })
  return botones
}

function textoLista(tareas, ahora = Date.now()) {
  const pendientes = tareas.filter((t) => !t.hecha).length
  const urgentes = tareas.filter((t) => ['urgente', 'vencida'].includes(estadoEntrega(t, ahora).nivel)).length
  const pie = `${pendientes} pendiente(s) de ${tareas.length}${urgentes ? ` · ${urgentes} urgente(s) 🔥` : ''}`
  return caja('📋', 'Tus tareas', tareas.map((t, i) => lineaTarea(t, i, ahora)), pie)
}

function textoDetalle(t, ahora = Date.now()) {
  const e = estadoEntrega(t, ahora)
  return caja('📝', 'Tarea', [
    ['Materia', t.materia, '📚'],
    ['Tarea', t.texto, '✏️'],
    ['Estado', t.hecha ? 'Completada ✅' : 'Pendiente ⬜', '📌'],
    e.texto ? ['Entrega', e.nivel === 'vencida' ? 'Vencida ⚠️' : `en ${e.texto}`, '⏰'] : null,
  ], 'Toca un botón para continuar')
}

function textoAyuda(P) {
  return caja('📚', 'Agregar tarea', [
    `Escribe: ${P}tarea agregar <materia> - <tarea> | <fecha>`,
    'La fecha es opcional (dd/mm, hoy o mañana).',
    '',
    `Ejemplo: ${P}tarea agregar Matemática - Ejercicios 1 al 10 | 20/11`,
  ], 'Con fecha, te aviso solo: un día antes y el mismo día 🔔')
}

module.exports = {
  estadoEntrega, lineaTarea, pendientesOrdenadas, buscarTarea, seccionesLista,
  botonesRapidos, botonesDetalle, textoLista, textoDetalle, textoAyuda, MAX_FILAS_PENDIENTES,
}
