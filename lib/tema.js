// Temas visuales de YuiBot-MD. TODOS los comandos que arman sus respuestas con lib/estilo.js
// (cajas, filas y listas) cambian de aspecto al cambiar el tema: aquí es el único lugar que hay que tocar.
//
//   normal  → el diseño de siempre
//   navidad → 🎄 copos, estrellas y regalos (se activa solo del 1 de diciembre al 6 de enero)
//
// Modo (de mayor a menor prioridad): variable de entorno YUI_TEMA → `.tema` (se guarda en data/tema.json) → TEMA en defaults.js → "auto".
// Para crear un tema nuevo (Halloween, Año Nuevo…) basta con añadir una entrada a TEMAS y, si es de temporada, a TEMPORADAS.
const path = require('path')
const defaults = require('../defaults')
const { crearAlmacenCacheado } = require('./escrituraAtomica')

const ESTADOS_NORMAL = { exito: '✅', error: '❌', aviso: '⚠️', espera: '⏳' }

const TEMAS = {
  normal: {
    nombre: 'Normal',
    apertura: '╭━━━〔', cierre: '〕━━━⬣', base: (ancho) => `╰${'━'.repeat(ancho)}⬣`,
    vinetas: ['✦'], adorno: '🌸', estados: ESTADOS_NORMAL,
    separador: '', saludo: '', frases: [], evento: null, letras: 'negrita',
  },
  navidad: {
    nombre: 'Navidad',
    apertura: '╭🎄━━〔', cierre: '〕━━❄️', base: (ancho) => `╰━━🎅${'━'.repeat(Math.max(4, ancho - 5))}⬣`,
    vinetas: ['❄️', '⭐', '🎁', '🔔', '🍬', '🦌', '🧦'],
    adorno: '🎄',
    // El ❌ se mantiene: es la señal de error que todos reconocen.
    estados: { exito: '🎁', error: '❌', aviso: '🔔', espera: '🦌' },
    letras: 'caligrafia', // letras cursivas de felicitación en títulos y etiquetas
    separador: '❄️🎄❄️🎄❄️🎄❄️🎄❄️',
    saludo: '🎅 ¡Felices fiestas!',
    // Una frase al pie de las cajas que no traen pie propio.
    frases: [
      '🎅 Ho, ho, ho… ¡Feliz Navidad!', '🎄 Que tu árbol brille todo diciembre', '❄️ Nieva magia en este chat',
      '🎁 Lo mejor de la Navidad es compartirla', '⭐ Pide un deseo, la estrella te escucha', '🔔 Jingle bells, jingle bells…',
      '🦌 Rodolfo ya calienta motores', '🍬 Esta respuesta viene con dulce de Navidad', '🧦 Deja tu calcetín cerca del bot',
      '🕯️ Paz, amor y buena conexión', '☃️ Un muñeco de nieve te manda saludos', '🎶 Noche de paz, noche de amor…',
      '🍪 Las galletas son para Santa, ¿ok?', '🌟 Que cada día de diciembre sea especial', '🎅 Santa dice que te portaste bien',
      '🎄 ¡Que la magia navideña te acompañe!', '💝 Feliz Navidad de parte de Yui', '🛷 Santa ya va en camino',
      '❄️ Copo a copo se forma la Navidad', '🥂 Brindemos por un año nuevo mejor',
    ],
    evento: { nombre: 'Navidad', mes: 12, dia: 25, hoy: '🎅 ¡Hoy es Navidad! 🎄🎁 ¡Feliz Navidad!', cuenta: (n) => `🎄 Faltan *${n}* día${n === 1 ? '' : 's'} para Navidad` },
  },
}

// Temporadas automáticas (mes y día, hora de Perú): [desdeMes, desdeDía, hastaMes, hastaDía]
const TEMPORADAS = { navidad: [12, 1, 1, 6] }

const MODOS = ['auto', ...Object.keys(TEMAS)]
const almacen = crearAlmacenCacheado(path.join(__dirname, '..', 'data', 'tema.json'), () => ({}))
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
  try { const d = almacen.leer(); if (d?.fijado && MODOS.includes(d.modo)) return d.modo } catch { /* sin archivo: se usa defaults.js */ }
  return MODOS.includes(defaults.TEMA) ? defaults.TEMA : 'auto'
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

const letras = (ahora) => actual(ahora).letras || 'negrita'
const estado = (nombre, ahora) => actual(ahora).estados?.[nombre] || ESTADOS_NORMAL[nombre]
const separador = (ahora) => actual(ahora).separador || ''
const saludo = (ahora) => actual(ahora).saludo || ''
const frase = (ahora) => { const f = actual(ahora).frases; return f.length ? f[Math.floor(Math.random() * f.length)] : '' }

/** "🎄 Faltan 45 días para Navidad" (o el aviso del día); '' si el tema no tiene fecha. */
function cuentaRegresiva(ahora = Date.now()) {
  const ev = actual(ahora).evento
  if (!ev) return ''
  const { mes, dia } = fechaPeru(ahora)
  const hoy = Date.UTC(2001, mes - 1, dia)
  let meta = Date.UTC(2001, ev.mes - 1, ev.dia)
  if (meta < hoy) meta = Date.UTC(2002, ev.mes - 1, ev.dia)
  const n = Math.round((meta - hoy) / 86400000)
  return n === 0 ? ev.hoy : ev.cuenta(n)
}

/** Cambia el modo de forma permanente: 'auto' | 'normal' | 'navidad'. */
function fijarModo(nuevo) {
  const m = String(nuevo || '').toLowerCase()
  if (!MODOS.includes(m)) throw new Error(`Tema desconocido. Opciones: ${MODOS.join(', ')}`)
  almacen.guardar({ modo: m, fijado: true }) // `fijado`: una decisión de `.tema`, no un valor por omisión
  return m
}

/** Solo para pruebas: fuerza un tema sin tocar el archivo (null lo quita). */
function forzar(nombre) { forzado = nombre }

module.exports = { letras, estado, separador, saludo, frase, cuentaRegresiva, TEMAS, TEMPORADAS, MODOS, activo, actual, vineta, adorno, modo, fijarModo, forzar, enTemporada, fechaPeru }
