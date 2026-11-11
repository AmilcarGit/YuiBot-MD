// Temas visuales de YuiBot-MD. TODOS los comandos que arman sus respuestas con lib/estilo.js
// (cajas, filas y listas) cambian de aspecto al cambiar el tema: aquí es el único lugar que hay que tocar.
//
//   normal  → el diseño de siempre
//   navidad → 🎄 copos, estrellas y regalos (se activa solo del 1 de diciembre al 6 de enero)
//
// Modo (de mayor a menor prioridad): variable de entorno YUI_TEMA → `.tema` (se guarda en data/tema.json) → "auto".
// Para crear un tema nuevo (Halloween, Año Nuevo…) basta con añadir una entrada a TEMAS y, si es de temporada, a TEMPORADAS.
const path = require('path')
const { crearAlmacenCacheado } = require('./escrituraAtomica')

const TEMAS = {
  normal: {
    nombre: 'Normal',
    apertura: '╭━━━〔', cierre: '〕━━━⬣', base: (ancho) => `╰${'━'.repeat(ancho)}⬣`,
    vinetas: ['✦'], adorno: '🌸',
  },
  navidad: {
    nombre: 'Navidad',
    apertura: '╭🎄━━〔', cierre: '〕━━❄️', base: (ancho) => `╰━━🎅${'━'.repeat(Math.max(4, ancho - 5))}⬣`,
    vinetas: ['❄️', '⭐', '🎁', '🔔', '🍬'], adorno: '🎄',
  },
}

// Temporadas automáticas (mes y día, hora de Perú): [desdeMes, desdeDía, hastaMes, hastaDía]
const TEMPORADAS = { navidad: [12, 1, 1, 6] }

const MODOS = ['auto', ...Object.keys(TEMAS)]
const almacen = crearAlmacenCacheado(path.join(__dirname, '..', 'data', 'tema.json'), () => ({ modo: 'auto' }))
let forzado = null // solo para pruebas

function fechaPeru(ahora = Date.now()) {
  const d = new Date(ahora - 5 * 3600 * 1000)
  return { mes: d.getUTCMonth() + 1, dia: d.getUTCDate() }
}

function enTemporada([m1, d1, m2, d2], ahora) {
  const { mes, dia } = fechaPeru(ahora)
  const hoy = mes * 100 + dia
  const ini = m1 * 100 + d1
  const fin = m2 * 100 + d2
  return ini <= fin ? hoy >= ini && hoy <= fin : hoy >= ini || hoy <= fin // cruza el fin de año
}

function modo() {
  const env = String(process.env.YUI_TEMA || '').toLowerCase()
  if (forzado) return forzado
  if (MODOS.includes(env)) return env
  try { const m = almacen.leer()?.modo; return MODOS.includes(m) ? m : 'auto' } catch { return 'auto' }
}

/** Nombre del tema que se está usando ahora mismo. */
function activo(ahora = Date.now()) {
  const m = modo()
  if (m !== 'auto') return m
  for (const [nombre, rango] of Object.entries(TEMPORADAS)) if (enTemporada(rango, ahora)) return nombre
  return 'normal'
}

const actual = (ahora) => TEMAS[activo(ahora)] || TEMAS.normal

/** Viñeta de la fila número `i` (en Navidad van rotando ❄️ ⭐ 🎁 🔔 🍬). */
const vineta = (i = 0, ahora) => { const v = actual(ahora).vinetas; return v[((i % v.length) + v.length) % v.length] }
const adorno = (ahora) => actual(ahora).adorno

/** Cambia el modo de forma permanente: 'auto' | 'normal' | 'navidad'. */
function fijarModo(nuevo) {
  const m = String(nuevo || '').toLowerCase()
  if (!MODOS.includes(m)) throw new Error(`Tema desconocido. Opciones: ${MODOS.join(', ')}`)
  almacen.guardar({ modo: m })
  return m
}

/** Solo para pruebas: fuerza un tema sin tocar el archivo (null lo quita). */
function forzar(nombre) { forzado = nombre }

module.exports = { TEMAS, TEMPORADAS, MODOS, activo, actual, vineta, adorno, modo, fijarModo, forzar, enTemporada, fechaPeru }
