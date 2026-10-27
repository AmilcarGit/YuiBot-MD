// Resumen automático de la mañana: clases de hoy, tareas y exámenes próximos.
// Cada persona lo activa con ".tarea resumen on"; lo envía por privado el
// mismo bot donde lo activó (para que no lleguen duplicados).
const escuela = require('./escuela')
const { lineaTarea, pendientesOrdenadas } = require('./tareasUI')
const { caja } = require('./estilo')
const { describirDuracion, formatearFechaPeru, OFFSET_HORAS } = require('./fechas')
const { claveDia } = require('./db')

const HORA_ENVIO = 7 // 7:00 (hora de Perú)
const HORA_LIMITE = 12 // si el bot estuvo apagado, se manda hasta el mediodía
const REINTENTO_MS = 30 * 60000
const INTERVALO_MS = 60000
const DIA_MS = 86400000

const horaPeru = (ahora) => new Date(ahora - OFFSET_HORAS * 3600000).getUTCHours()

/** Devuelve { texto, botones } o null si no hay nada que contar. */
function construirResumen(ficha, ahora = Date.now(), P = '!') {
  const dia = escuela.diaHoy(ahora)
  const clases = (ficha.horario || []).filter((c) => c.dia === dia).sort((a, b) => a.inicio.localeCompare(b.inicio))
  const tareas = pendientesOrdenadas(ficha.tareas || []).slice(0, 8)
  const examenes = (ficha.examenes || [])
    .filter((e) => e.cuando > ahora && e.cuando - ahora < 7 * DIA_MS)
    .sort((a, b) => a.cuando - b.cuando)
  if (!clases.length && !tareas.length && !examenes.length) return null

  const filas = []
  if (clases.length) {
    filas.push('*🏫 Clases de hoy*')
    clases.forEach((c) => filas.push(`🕒 ${c.inicio}${c.fin ? `–${c.fin}` : ''}  ${c.materia}`))
  }
  if (tareas.length) {
    if (filas.length) filas.push('')
    filas.push('*📝 Tareas pendientes*')
    tareas.forEach((t, i) => filas.push(lineaTarea(t, i, ahora).replace(/^⬜ \d+\. /, '• ')))
  }
  if (examenes.length) {
    if (filas.length) filas.push('')
    filas.push('*📖 Exámenes de la semana*')
    examenes.forEach((e) => filas.push(`• ${e.materia} — ${formatearFechaPeru(new Date(e.cuando))} (en ${describirDuracion(e.cuando - ahora)})`))
  }
  return {
    texto: caja('🌅', 'Buenos días', filas, 'Que tengas un gran día de estudio 💪'),
    botones: [
      { text: '📋 Mis tareas', id: `${P}tarea lista` },
      { text: '🏫 Clases de hoy', id: `${P}misclases hoy` },
      { text: '📖 Mis exámenes', id: `${P}misexamenes` },
    ],
  }
}

async function enviar(sock, jid, resumen) {
  try {
    await sock.sendMessage(jid, { text: resumen.texto, buttons: resumen.botones })
  } catch {
    await sock.sendMessage(jid, { text: resumen.texto })
  }
}

/** Revisa a todos los que activaron el resumen y envía los que toquen. */
async function procesar(sock, idBot, ahora = Date.now(), P = '!') {
  const hora = horaPeru(ahora)
  if (hora < HORA_ENVIO || hora >= HORA_LIMITE) return 0
  const hoy = claveDia(ahora)
  let enviados = 0
  for (const [numero, ficha] of Object.entries(escuela.todos())) {
    if (!ficha?.resumenDiario || ficha.resumenBot !== idBot || ficha.ultimoResumen === hoy) continue
    if (ficha.intentoResumen && ahora - ficha.intentoResumen < REINTENTO_MS) continue

    const datos = escuela.abrir(numero)
    const resumen = construirResumen(datos.ficha, ahora, P)
    if (!resumen) {
      datos.ficha.ultimoResumen = hoy // nada que contar hoy
      datos.guardar()
      continue
    }
    try {
      await enviar(sock, ficha.jidPrivado || `${numero}@s.whatsapp.net`, resumen)
      datos.ficha.ultimoResumen = hoy
      enviados += 1
    } catch (error) {
      datos.ficha.intentoResumen = ahora
      console.error(`[RESUMEN] No se pudo enviar a ${numero}:`, error.message)
    }
    datos.guardar()
  }
  return enviados
}

let temporizador = null
function iniciar(sock, idBot, P = '!') {
  detener()
  temporizador = setInterval(() => procesar(sock, idBot, Date.now(), P).catch((e) => console.error('[RESUMEN]', e.message)), INTERVALO_MS)
  if (temporizador.unref) temporizador.unref()
}
function detener() {
  if (temporizador) clearInterval(temporizador)
  temporizador = null
}

module.exports = { construirResumen, procesar, iniciar, detener, HORA_ENVIO, HORA_LIMITE }
