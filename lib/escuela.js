// Datos escolares por persona (tareas, horario, notas, exámenes).
// Se guardan en data/escuela.json y son los mismos en el principal y en los
// subbots. La nota máxima y la mínima para aprobar siguen el sistema peruano
// (0 a 20, aprueba con 11).
const path = require('path')
const { crearAlmacenCacheado } = require('./escrituraAtomica')
const { OFFSET_HORAS } = require('./fechas')

const RUTA = path.join(__dirname, '..', 'data', 'escuela.json')
const almacen = crearAlmacenCacheado(RUTA)

const NOTA_MAX = 20
const NOTA_APROBAR = 11
const LIMITES = { tareas: 50, horario: 60, notas: 200, examenes: 15 }

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const ALIAS_DIAS = {
  domingo: 0, dom: 0, lunes: 1, lun: 1, martes: 2, mar: 2, miercoles: 3, mie: 3, mier: 3,
  jueves: 4, jue: 4, viernes: 5, vie: 5, sabado: 6, sab: 6,
}

const sinAcentos = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

function numeroUsuario(msg) {
  const jid = msg.key.participantAlt || msg.key.participant || msg.key.remoteJid
  return jid.split('@')[0].split(':')[0]
}

// Devuelve los datos de alguien y un guardar() que los persiste.
function abrir(numero) {
  const todo = almacen.leer()
  const ficha = todo[numero] || {}
  for (const k of ['tareas', 'horario', 'notas', 'examenes']) if (!Array.isArray(ficha[k])) ficha[k] = []
  ficha.siguiente = ficha.siguiente || 1
  return {
    ficha,
    id: () => ficha.siguiente++,
    guardar() {
      todo[numero] = ficha
      almacen.guardar(todo)
    },
  }
}

// ── Días y horas ──────────────────────────────────────────────────────
function diaDe(texto) {
  const n = sinAcentos(texto)
  return Object.prototype.hasOwnProperty.call(ALIAS_DIAS, n) ? ALIAS_DIAS[n] : null
}

/** Día de la semana (0 = domingo) en hora de Perú. */
function diaHoy(ahora = Date.now(), sumar = 0) {
  return new Date(ahora - OFFSET_HORAS * 3600000 + sumar * 86400000).getUTCDay()
}

function horaValida(t) {
  const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

/** "08:00-09:30" o "08:00" → { inicio, fin } o null. */
function rangoHora(t) {
  const [a, b] = String(t || '').split('-')
  const inicio = horaValida(a)
  if (!inicio) return null
  if (b === undefined) return { inicio, fin: null }
  const fin = horaValida(b)
  return fin && fin > inicio ? { inicio, fin } : null
}

// ── Notas ─────────────────────────────────────────────────────────────
const numeroDe = (t) => {
  const n = Number(String(t).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** "15" o "15x30" (nota x peso) → { nota, peso } o null. */
function leerNota(token) {
  const m = String(token || '').trim().toLowerCase().match(/^(\d+(?:[.,]\d+)?)(?:x(\d+(?:[.,]\d+)?))?$/)
  if (!m) return null
  const nota = numeroDe(m[1])
  const peso = m[2] === undefined ? 1 : numeroDe(m[2])
  if (nota === null || nota > NOTA_MAX || !peso || peso <= 0) return null
  return { nota, peso }
}

/** Promedio ponderado (peso 1 si no se indica). null si no hay notas. */
function promedio(lista) {
  const pesoTotal = lista.reduce((t, n) => t + (n.peso || 1), 0)
  if (!lista.length || pesoTotal <= 0) return null
  return lista.reduce((t, n) => t + n.nota * (n.peso || 1), 0) / pesoTotal
}

/** Promedio por materia y general (promedio de los promedios). */
function resumenNotas(notas) {
  const porMateria = new Map()
  for (const n of notas) {
    const clave = sinAcentos(n.materia)
    if (!porMateria.has(clave)) porMateria.set(clave, { materia: n.materia, notas: [] })
    porMateria.get(clave).notas.push(n)
  }
  const materias = [...porMateria.values()].map((m) => ({ materia: m.materia, cantidad: m.notas.length, promedio: promedio(m.notas) }))
  materias.sort((a, b) => a.materia.localeCompare(b.materia))
  const general = materias.length ? materias.reduce((t, m) => t + m.promedio, 0) / materias.length : null
  return { materias, general }
}

/**
 * Nota que necesitas en lo que falta para llegar a la meta.
 * @param {Array<{nota,peso}>} actuales
 * @param {number} meta
 * @param {number} falta peso total que falta rendir (1 = una nota más)
 */
function notaNecesaria(actuales, meta, falta = 1) {
  const pesoActual = actuales.reduce((t, n) => t + n.peso, 0)
  const suma = actuales.reduce((t, n) => t + n.nota * n.peso, 0)
  const necesaria = (meta * (pesoActual + falta) - suma) / falta
  return { necesaria, estado: necesaria <= 0 ? 'ya' : necesaria > NOTA_MAX ? 'imposible' : 'posible' }
}

const fmt = (n, dec = 2) => (Number.isInteger(n) ? String(n) : n.toFixed(dec).replace(/\.?0+$/, ''))
const estadoNota = (n) => (n >= NOTA_APROBAR ? '✅' : '⚠️')

module.exports = {
  RUTA, NOTA_MAX, NOTA_APROBAR, LIMITES, DIAS, sinAcentos, numeroUsuario, abrir, diaDe, diaHoy,
  horaValida, rangoHora, leerNota, promedio, resumenNotas, notaNecesaria, fmt, estadoNota,
}
